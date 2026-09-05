-- Migration 0020: professionals + businesses.plan (T01)
-- Fundação (Equipe + Billing). Follows ADR 0006 and ADR 0007.
--
--   * public.professionals: recurso do negócio, sem conta. O dono é um
--     profissional por padrão (semeado do display_name do dono).
--   * public.businesses.plan (free | pro): a base para o gate de limites.
--
-- Settled seam (Opção A): a seed é garantida no banco por um trigger
-- `after insert` em businesses, e a própria migração semeia os negócios que já
-- existiam. Assim nenhum negócio fica sem profissional padrão, seja ele
-- anterior ou posterior a esta migração.
--
-- Idempotente e reversível em dev (participa do repositório de migrations).

-- ===========================================================================
-- 1. business_plan enum.
-- ===========================================================================
do $$
begin
  create type business_plan as enum ('free', 'pro');
exception when duplicate_object then null;
end $$;

-- ===========================================================================
-- 2. public.professionals.
-- ===========================================================================
create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_professionals_business_active
  on public.professionals (business_id, is_active);

create trigger set_updated_at_professionals
  before update on public.professionals
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- 3. public.businesses.plan.
-- ===========================================================================
alter table public.businesses
  add column if not exists plan business_plan not null default 'free';

-- ===========================================================================
-- 4. RLS on professionals (owner-scoped, mirrors the other child tables).
--    Anon has no access: professionals live only inside the owner dashboard.
-- ===========================================================================
alter table public.professionals enable row level security;

create policy professionals_select_own on public.professionals
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy professionals_insert_own on public.professionals
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy professionals_update_own on public.professionals
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy professionals_delete_own on public.professionals
  for delete using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- Explicit grants so the dashboard (authenticated) and the server (service_role)
-- can CRUD professionals; anon gets nothing. RLS still scopes the rows.
grant select, insert, update, delete on public.professionals to authenticated, service_role;
revoke all on public.professionals from anon;

-- ===========================================================================
-- 5. Trigger: seed the owner's default professional on a new business.
--    INVOKER posture (migration 0014): the caller is always the one creating
--    the business (owner via authenticated, or postgres/service_role via setup),
--    so RLS scopes the profile read and the professional insert correctly.
-- ===========================================================================
create or replace function public.ensure_default_professional()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text;
begin
  select p.display_name into v_name
  from public.profiles p
  where p.id = new.owner_id;

  insert into public.professionals (business_id, name, is_active)
  values (new.id, coalesce(v_name, left(new.name, 80)), true);

  return new;
end;
$$;

revoke all on function public.ensure_default_professional() from public, anon;
grant execute on function public.ensure_default_professional() to authenticated, service_role;

drop trigger if exists ensure_default_professional_on_business on public.businesses;
create trigger ensure_default_professional_on_business
  after insert on public.businesses
  for each row execute function public.ensure_default_professional();

-- ===========================================================================
-- 6. Seed the default professional for businesses that already existed.
--    Runs as the migration owner (bypasses RLS). `where not exists` makes it
--    idempotent: a business that already has a professional is left untouched.
-- ===========================================================================
insert into public.professionals (business_id, name, is_active)
select b.id, coalesce(p.display_name, left(b.name, 80)), true
from public.businesses b
left join public.profiles p on p.id = b.owner_id
where not exists (
  select 1 from public.professionals pr where pr.business_id = b.id
);
