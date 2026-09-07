-- Migration 0035: endurecer o gate de plano (ADR 0008). Follows up on 0034,
-- which reintroduced `businesses.plan` + `subscriptions`. Three hardening
-- changes:
--   * `subscriptions.plan` defaults to `pro` — a subscription row represents a
--     Mercado Pago preapproval, which is always the paid (Pro) plan, so a bare
--     insert should not yield a Free subscription.
--   * Explicit `service_role` table privileges on `subscriptions`, so the
--     Mercado Pago webhook path never depends on default privileges.
--   * `protect_business_plan` now guards INSERT too: a new business must start
--     Free, and an owner session may never write `plan` (the only upgrade path
--     is the server/webhook). The trigger fires on `before insert or update`.
-- Posture: security invoker + `set search_path = ''` (0014/0019), fully-qualified.

-- ===========================================================================
-- 1. subscriptions.plan defaults to pro (a subscription is always Pro).
-- ===========================================================================
alter table public.subscriptions
  alter column plan set default 'pro';

-- ===========================================================================
-- 2. Explicit service_role write privileges on subscriptions.
-- ===========================================================================
grant select, insert, update, delete on public.subscriptions to service_role;

-- ===========================================================================
-- 3. Guard businesses.plan on INSERT and UPDATE (owner sessions only).
-- ===========================================================================
create or replace function public.protect_business_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.plan <> 'free' then
      raise exception 'PLAN_CHANGE_SELF_SERVE_DISABLED'
        using errcode = 'P0001',
        hint = 'A new business starts on the Free plan; Pro is set by the server or webhook.';
    end if;
    if tg_op = 'UPDATE' and new.plan is distinct from old.plan then
      raise exception 'PLAN_CHANGE_SELF_SERVE_DISABLED'
        using errcode = 'P0001',
        hint = 'The plan can only be changed manually in the database or via the server.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_business_plan() from public, anon, authenticated, service_role;

drop trigger if exists protect_business_plan on public.businesses;
create trigger protect_business_plan
  before insert or update on public.businesses
  for each row execute function public.protect_business_plan();
