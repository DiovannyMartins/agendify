-- Migration 0034: reintroduzir o plano (businesses.plan) + tabela subscriptions.
-- Follows ADR 0008 (plano PROFISSIONAL com assinatura Mercado Pago). Reverses
-- the de-gate in 0033 (remove_team_and_plan) for the plan model ONLY: adds
-- `businesses.plan` (free | pro, default free) and the `subscriptions` table
-- (Mercado Pago preapproval data) with owner-scoped RLS. The plan is the seat
-- of the gate; `get_due_booking_reminders` is re-gated to Pro businesses.
-- Posture: security invoker + set search_path = '' (0014/0019) for triggers,
-- fully-qualified references.

-- ===========================================================================
-- 1. business_plan enum.
-- ===========================================================================
do $$
begin
  create type business_plan as enum ('free', 'pro');
exception when duplicate_object then null;
end $$;

-- ===========================================================================
-- 2. subscription_status enum.
-- ===========================================================================
do $$
begin
  create type subscription_status as enum ('pending', 'authorized', 'paused', 'cancelled');
exception when duplicate_object then null;
end $$;

-- ===========================================================================
-- 3. public.businesses.plan (the seat of the gate).
-- ===========================================================================
alter table public.businesses
  add column if not exists plan business_plan not null default 'free';

-- ===========================================================================
-- 4. public.subscriptions (Mercado Pago preapproval data).
--    One row per Mercado Pago preapproval; `mp_preapproval_id` is unique. A
--    business may have more than one row over time (re-subscription), but only
--    one is the current one (managed by the billing module, ADR 0008).
-- ===========================================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  mp_preapproval_id text not null unique,
  status subscription_status not null default 'pending',
  plan business_plan not null default 'free',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_business
  on public.subscriptions (business_id);

create trigger set_updated_at_subscriptions
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- 5. RLS on subscriptions: owner-scoped SELECT only. The owner can read their
--    subscription status in the dashboard; writes are administrative/server
--    only (service_role bypasses RLS, so the Mercado Pago webhook path writes).
-- ===========================================================================
alter table public.subscriptions enable row level security;

create policy subscriptions_select_own on public.subscriptions
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

-- No insert/update/delete policy for the owner, so RLS denies those; only the
-- server (service_role) writes. service_role bypasses RLS, so the Mercado Pago
-- webhook path writes. Explicit grants also close the anon surface.
grant select on public.subscriptions to authenticated;
revoke all on public.subscriptions from anon;

-- ===========================================================================
-- 6. Protect businesses.plan from self-serve (ADR 0008): an owner session must
--    never write `plan` directly — the only upgrade path is the server/webhook.
--    service_role (no auth.uid()) and the migration owner may still change it.
-- ===========================================================================
create or replace function public.protect_business_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.plan is distinct from old.plan and auth.uid() is not null then
    raise exception 'PLAN_CHANGE_SELF_SERVE_DISABLED'
      using errcode = 'P0001',
      hint = 'The plan can only be changed manually in the database or via the server.';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_business_plan() from public, anon, authenticated, service_role;

drop trigger if exists protect_business_plan on public.businesses;
create trigger protect_business_plan
  before update on public.businesses
  for each row execute function public.protect_business_plan();

-- ===========================================================================
-- 7. Re-gate the reminder candidates: only Pro businesses.
-- ===========================================================================
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
  where bus.plan = 'pro'
    and bk.status = 'confirmed'
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
