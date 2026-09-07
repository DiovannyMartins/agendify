-- Migration 0036: ciclo de vida do preapproval + carência (issue #24).
-- Follows ADR 0008. Completes the Mercado Pago subscription lifecycle that 0034
-- (plan + subscriptions) and 0035 (hardening) began:
--   * Adds `subscriptions.grace_period_end`: when a preapproval is `paused` or
--     `cancelled` (incl. a failed recurring payment, which Mercado Pago surfaces
--     as `paused`), the webhook handler sets this to now() + 7 days, keeping the
--     business Pro during the grace.
--   * `downgrade_expired_subscriptions()`: a service-role RPC that downgrades a
--     Pro business to Free once its CURRENT subscription's grace has expired
--     (data is preserved; only the gate changes). The "current" row is the most
--     recently created one, so a re-subscription (new authorized row) is never
--     clobbered by an older cancelled/paused row.
--   * A defensive pg_cron schedule runs the downgrade periodically; like the
--     booking-reminders job, it degrades to a NOTICE (and does not abort the
--     push) if pg_cron is unavailable.
-- Posture: security definer + `set search_path = ''` (0014/0019), fully-qualified
-- references, explicit grants, no public surface.

-- ===========================================================================
-- 1. subscriptions.grace_period_end.
-- ===========================================================================
alter table public.subscriptions
  add column if not exists grace_period_end timestamptz;

-- ===========================================================================
-- 2. Downgrade a business once its current subscription's grace has expired.
--    service-role only. `security definer` + `set search_path = ''` so the cron
--    caller (no owner uid) can read across subscriptions + businesses without
--    RLS; fully-qualified references per the 0014/0019 posture. The
--    `protect_business_plan` trigger on businesses does not block this: the
--    trigger only fires for `auth.uid() is not null`, and this runs as the
--    service context (uid is null). Idempotent: only Pro businesses whose grace
--    has passed are touched; a re-run affects nothing.
-- ===========================================================================
create or replace function public.downgrade_expired_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.businesses b
  set plan = 'free'
  where b.plan = 'pro'
    and exists (
      select 1
      from public.subscriptions s
      where s.business_id = b.id
        and s.status in ('paused', 'cancelled')
        and s.grace_period_end is not null
        and s.grace_period_end < now()
        and s.id = (
          select s2.id
          from public.subscriptions s2
          where s2.business_id = b.id
          order by s2.created_at desc
          limit 1
        )
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.downgrade_expired_subscriptions() from public, anon, authenticated;
grant execute on function public.downgrade_expired_subscriptions() to service_role;

-- ===========================================================================
-- 3. Defensive pg_cron schedule (mirrors the booking-reminders wiring).
-- ===========================================================================
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'subscription_grace: pg_cron unavailable (%); the downgrade cron was not scheduled.', sqlerrm;
end;
$$;

do $$
begin
  perform cron.unschedule('subscription-grace-downgrade');
exception when others then
  -- job not yet registered; safe to proceed to schedule.
  null;
end;
$$;

do $$
begin
  perform cron.schedule(
    'subscription-grace-downgrade',
    'every 30 minutes',
    $cron$select public.downgrade_expired_subscriptions()$cron$
  );
exception when others then
  raise notice 'subscription_grace: cron not scheduled (%). %', sqlstate, sqlerrm;
end;
$$;
