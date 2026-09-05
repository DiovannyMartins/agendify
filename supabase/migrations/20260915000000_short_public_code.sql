-- Migration: public_code curto (8 chars, Crockford base32, XXXX-XXXX).
--
-- O código público de uma reserva era um UUID (36 chars) exibido num Badge na
-- tela de confirmação — difícil de copiar/digitar. Passa a ser um código de 8
-- caracteres em Crockford base32 (sem 0/O, 1/I/L, sem ambiguidade), armazenado
-- sem hífen e exibido agrupado (AB12-CD34). Segue a postura security-definer +
-- set search_path = '' das migrations RPC (0014/0019), referências fully
-- qualified. Continua sem autorizar acesso a dados do cliente (§16); o token de
-- cancelamento derivado segue em lib/bookings/cancel.ts.

-- ===========================================================================
-- 1. Coluna: uuid -> text, com gerador próprio e backfill.
-- ===========================================================================
alter table public.bookings alter column public_code drop default;

alter table public.bookings alter column public_code type text using public_code::text;

-- Gerador de código único: 8 chars de um alfabeto Crockford (32 símbolos),
-- com retry quando já existe. Usado como default da coluna e no backfill.
create or replace function public.generate_public_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_code text;
begin
  loop
    v_code := (
      select string_agg(substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ', (floor(random() * 32) + 1)::int, 1), '')
      from generate_series(1, 8)
    );
    exit when not exists (
      select 1 from public.bookings where public_code = v_code
    );
  end loop;
  return v_code;
end;
$$;

-- Backfill: os valores antigos (uuid-as-text) não casam com o novo formato;
-- troca cada um por um código curto único.
do $$
declare
  v_row record;
begin
  for v_row in select id from public.bookings loop
    update public.bookings
    set public_code = public.generate_public_code()
    where id = v_row.id;
  end loop;
end $$;

alter table public.bookings alter column public_code set default public.generate_public_code();

-- ===========================================================================
-- 2. get_booking_by_public_code: assinatura text.
-- ===========================================================================
drop function if exists public.get_booking_by_public_code(uuid);

create or replace function public.get_booking_by_public_code(p_code text)
returns table (
  service_name text,
  start_at timestamptz,
  end_at timestamptz,
  business_name text,
  business_slug text,
  business_phone text,
  business_timezone text
)
language sql
security definer
set search_path = ''
as $$
  select
    b.service_name_snapshot,
    b.start_at,
    b.end_at,
    bus.name,
    bus.slug,
    bus.phone,
    bus.timezone
  from public.bookings b
  join public.businesses bus on bus.id = b.business_id
  where b.public_code = p_code
$$;

revoke all on function public.get_booking_by_public_code(text) from public, anon, authenticated;
grant execute on function public.get_booking_by_public_code(text) to service_role;

-- ===========================================================================
-- 3. cancel_booking_by_public_code: assinatura text.
-- ===========================================================================
drop function if exists public.cancel_booking_by_public_code(uuid, text);

create or replace function public.cancel_booking_by_public_code(
  p_code text,
  p_cancel_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking
  from public.bookings
  where public_code = p_code
  for update;

  if v_booking is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancel_reason = nullif(p_cancel_reason, ''),
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.cancel_booking_by_public_code(text, text) from public, anon, authenticated;
grant execute on function public.cancel_booking_by_public_code(text, text) to service_role;

-- ===========================================================================
-- 4. get_due_booking_reminders: public_code agora text (coluna mudou).
--    A assinatura (integer) não muda; só o tipo de retorno, exigindo drop.
-- ===========================================================================
drop function if exists public.get_due_booking_reminders(integer);

create or replace function public.get_due_booking_reminders(p_lead_minutes integer default 1440)
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  business_slug text,
  business_timezone text,
  customer_name_snapshot text,
  customer_email_snapshot text,
  service_name_snapshot text,
  start_at timestamptz,
  public_code text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    bk.id,
    bk.business_id,
    bus.name,
    bus.slug,
    bus.timezone,
    bk.customer_name_snapshot,
    bk.customer_email_snapshot,
    bk.service_name_snapshot,
    bk.start_at,
    bk.public_code
  from public.bookings bk
  join public.businesses bus on bus.id = bk.business_id
  where bk.status = 'confirmed'
    and bk.reminder_sent_at is null
    and bk.customer_email_snapshot is not null
    and bk.customer_email_snapshot <> ''
    and bk.start_at > now()
    and bk.start_at <= now() + make_interval(mins => p_lead_minutes)
  order by bk.start_at asc;
end;
$$;

revoke all on function public.get_due_booking_reminders(integer) from public, anon, authenticated;
grant execute on function public.get_due_booking_reminders(integer) to service_role;
