-- Migration 0021: agenda por profissional (T02)
-- Follows ADR 0006. availability, availability_blocks e bookings ganham
-- professional_id, e a exclusion constraint anti-sobreposição de bookings migra
-- de (business_id, ...) para (professional_id, ...). business_id permanece como
-- coluna-espelho para RLS/consulta por negócio.
--
-- Postura (T01): aditiva e não-destrutiva. professional_id é nullable no schema
-- — a fase T02 coexiste ao lado do schema anterior, sem remover colunas — mas um
-- trigger `before insert` o preenche sempre com o profissional padrão do negócio
-- (o dono) quando o chamador não o informar. Assim nenhum registro fica sem
-- profissional, e a exclusion constraint/sobreposição (que precisam de um valor
-- igual não-nulo para disparar) continuam cobrindo o caso de um mesmo
-- profissional. O RPC create_booking (pré-T03) segue funcionando e retorna a
-- reserva associada ao profissional padrão.
--
-- O backfill associa os dados pré-existentes (availability, blocks, bookings) ao
-- profissional padrão do respectivo negócio, de forma idempotente.

-- ===========================================================================
-- 1. professional_id (nullable) nas três tabelas da agenda.
-- ===========================================================================
alter table public.availability
  add column if not exists professional_id uuid;

alter table public.availability_blocks
  add column if not exists professional_id uuid;

alter table public.bookings
  add column if not exists professional_id uuid;

-- ===========================================================================
-- 2. Backfill idempotente para o profissional padrão (o dono) de cada negócio.
--    `where professional_id is null` + subquery por negócio: re-executar não
--    duplica nem sobrescreve. T01 garante ao menos um profissional por negócio.
-- ===========================================================================
update public.availability a
set professional_id = (
  select pr.id
  from public.professionals pr
  where pr.business_id = a.business_id
  order by pr.created_at asc, pr.id asc
  limit 1
)
where a.professional_id is null;

update public.availability_blocks bl
set professional_id = (
  select pr.id
  from public.professionals pr
  where pr.business_id = bl.business_id
  order by pr.created_at asc, pr.id asc
  limit 1
)
where bl.professional_id is null;

update public.bookings b
set professional_id = (
  select pr.id
  from public.professionals pr
  where pr.business_id = b.business_id
  order by pr.created_at asc, pr.id asc
  limit 1
)
where b.professional_id is null;

-- ===========================================================================
-- 3. Unicidade do dono: unique (id, business_id) em professionals para sustentar
--    o FK composto (professional_id, business_id) — um registro só pode referir
--    um profissional do seu próprio negócio (mesmo padrão do 0013 §5 p/ services).
-- ===========================================================================
alter table public.professionals
  add constraint professionals_id_business_id_key
  unique (id, business_id);

-- ===========================================================================
-- 4. FKs compostas (redundância evitada: apenas uma FK por tabela).
-- ===========================================================================
alter table public.availability
  add constraint availability_professional_business_fkey
  foreign key (professional_id, business_id)
  references public.professionals (id, business_id);

alter table public.availability_blocks
  add constraint blocks_professional_business_fkey
  foreign key (professional_id, business_id)
  references public.professionals (id, business_id);

alter table public.bookings
  add constraint bookings_professional_business_fkey
  foreign key (professional_id, business_id)
  references public.professionals (id, business_id);

-- ===========================================================================
-- 5. Índices para consultas por profissional (o GiST da exclusão é separado).
-- ===========================================================================
create index if not exists idx_availability_professional
  on public.availability (professional_id);

create index if not exists idx_blocks_professional_start
  on public.availability_blocks (professional_id, start_at);

create index if not exists idx_bookings_professional_start
  on public.bookings (professional_id, start_at);

-- ===========================================================================
-- 6. Garantia de profissional no insert (preenche com o padrão quando omitido).
--    INVOKER + '' search_path (postura 0014/0019). Usado por ensure_* na
--    availability; nos blocks/bookings o preenchimento é embutido nas funções de
--    sobreposição (que precisam ler a coluna e disparar antes da exclusão).
-- ===========================================================================
create or replace function public.ensure_professional_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_default uuid;
begin
  if new.professional_id is null then
    select pr.id into v_default
    from public.professionals pr
    where pr.business_id = new.business_id
    order by pr.created_at asc, pr.id asc
    limit 1;
    new.professional_id := v_default;
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_professional_id() from public, anon, authenticated, service_role;

drop trigger if exists ensure_professional_id_availability on public.availability;
create trigger ensure_professional_id_availability
  before insert on public.availability
  for each row execute function public.ensure_professional_id();

-- ===========================================================================
-- 7. Sobreposição bloco×reserva passa a ser por profissional: dois profissionais
--    no mesmo horário são permitidos; um bloco/reserva só conflita com o mesmo
--    profissional. O lock de transação agora serializa por professional_id.
-- ===========================================================================
create or replace function public.prevent_block_booking_overlap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_default uuid;
begin
  if new.professional_id is null then
    select pr.id into v_default
    from public.professionals pr
    where pr.business_id = new.business_id
    order by pr.created_at asc, pr.id asc
    limit 1;
    new.professional_id := v_default;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.professional_id::text, 0));
  if exists (
    select 1
    from public.bookings b
    where b.professional_id = new.professional_id
      and b.status <> 'cancelled'
      and tstzrange(new.start_at, new.end_at, '[)') && tstzrange(b.start_at, b.end_at, '[)')
  ) then
    raise exception 'BLOCK_BOOKING_OVERLAP';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_booking_block_overlap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_default uuid;
begin
  if new.professional_id is null then
    select pr.id into v_default
    from public.professionals pr
    where pr.business_id = new.business_id
    order by pr.created_at asc, pr.id asc
    limit 1;
    new.professional_id := v_default;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.professional_id::text, 0));
  if new.status <> 'cancelled' and exists (
    select 1
    from public.availability_blocks bl
    where bl.professional_id = new.professional_id
      and tstzrange(new.start_at, new.end_at, '[)') && tstzrange(bl.start_at, bl.end_at, '[)')
  ) then
    raise exception 'BOOKING_BLOCK_OVERLAP';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_block_booking_overlap() from public, anon;
grant execute on function public.prevent_block_booking_overlap() to authenticated, service_role;
revoke all on function public.prevent_booking_block_overlap() from public, anon;
grant execute on function public.prevent_booking_block_overlap() to authenticated, service_role;

-- ===========================================================================
-- 8. Exclusion constraint de bookings migra de business_id para professional_id.
--    Dois profissionais no mesmo horário: OK. Mesmo profissional sobreposto:
--    rejeitado, inclusive sob concorrência (GiST + status <> 'cancelled').
-- ===========================================================================
alter table public.bookings
  drop constraint if exists bookings_no_overlap;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status <> 'cancelled');

-- ===========================================================================
-- 9. Unicidade de faixa de disponibilidade passa a ser por profissional.
-- ===========================================================================
alter table public.availability
  drop constraint if exists availability_business_weekday_start_key;

alter table public.availability
  add constraint availability_professional_weekday_start_key
  unique (professional_id, weekday, start_time);
