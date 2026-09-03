-- Migration 0024: proteção do plano contra self-serve (T07)
-- Follows ADR 0007. `businesses.plan` is the seat of the monetization gate and
-- must NOT be writable by an owner session. In dev/preview the server action
-- `setPlan` upgrades via the privileged service role; the owner never writes
-- `plan` directly. In production there is no self-serve path at all — the plan
-- is set manually in the DB. This trigger is the DB-level hard guarantee (same
-- posture as the T06 `enforce_plan_professional_limit` trigger): without it, the
-- pre-existing `businesses_update_own` RLS policy would let an owner update
-- every column (including `plan`), making the app-level gate bypassable.
--
-- Posture: security invoker + `set search_path = ''` (0014/0019), all references
-- fully qualified. A plan change is rejected only when a REAL user session
-- (`auth.uid()` is NOT NULL) is present. The privileged service role (and the
-- migration owner) have no authenticated uid and may still change the plan —
-- that is the single, explicit upgrade path Stripe will later hook into.
--
-- Deactivation/downgrade is by design not exposed to the owner; only an upgrade
-- to Pro should ever flow through setPlan, and only from a server context.

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
