-- Migration 0039: re-subscription during the grace window (US16).
-- The cancel/re-subscribe flow creates a NEW `pending` subscription row while
-- the business is still Pro (the old `cancelled` row's grace is active). If the
-- user abandons the checkout, that `pending` row becomes the CURRENT row, and the
-- previous `downgrade_expired_subscriptions` predicate (current row must be
-- `paused`/`cancelled` with a lapsed grace) would never downgrade the business —
-- it would stay Pro for free. This migration makes the downgrade robust: a Pro
-- business is downgraded when its CURRENT subscription is not `authorized` and no
-- grace is still active anywhere for that business.
--
-- Posture preserved from 0038: security definer + `set search_path = ''`,
-- fully-qualified references, explicit grants, no public surface, idempotent.
-- The `protect_business_plan` trigger does not block this (service context, no
-- `auth.uid()`).

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
        and s.status <> 'authorized'
        and s.id = (
          select s2.id
          from public.subscriptions s2
          where s2.business_id = b.id
          order by s2.created_at desc
          limit 1
        )
        and not exists (
          select 1
          from public.subscriptions g
          where g.business_id = b.id
            and g.status in ('paused', 'cancelled')
            and g.grace_period_end is not null
            and g.grace_period_end >= now()
        )
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.downgrade_expired_subscriptions() from public, anon, authenticated;
grant execute on function public.downgrade_expired_subscriptions() to service_role;
