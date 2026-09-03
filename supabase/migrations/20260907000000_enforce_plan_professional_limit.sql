-- Migration 0023: gate de plano — limite de profissionais (T06)
-- Follows ADR 0007. The team-size limit (Free=1, Pro=3) is a hard, server-side
-- rule. RLS already lets the owner insert/reactivate professionals directly, so a
-- client-side or server-action-only check alone would be bypassable. This trigger
-- closes that gap: a row that becomes ACTIVE (new insert, or an update that
-- reactivates a deactivated professional) is rejected when the business already
-- has as many active professionals as its plan allows.
--
-- Posture (T01/T02): security invoker + `set search_path = ''` (0014/0019), all
-- references fully qualified. The count is guarded by a transaction-scoped
-- advisory lock keyed on the business, so the check is stable under concurrency
-- (same pattern as the booking-overlap triggers in 0021).
--
-- Deactivation is always allowed (a professional with history is never deleted,
-- only deactivated) and a keep-active update adds no seat, so neither is gated.

create or replace function public.enforce_plan_professional_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_plan public.business_plan;
  v_limit integer;
  v_active integer;
begin
  v_business_id := new.business_id;

  -- Only a row that becomes active adds an entitled seat: a fresh insert that is
  -- active, or an update reactivating a previously inactive professional.
  if new.is_active and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and not old.is_active)) then
    -- Serialize concurrent reactivations/creates for the same business so the
    -- count below reflects a consistent transaction snapshot.
    perform pg_advisory_xact_lock(hashtextextended(v_business_id::text, 0));

    select b.plan into v_plan
    from public.businesses b
    where b.id = v_business_id;

    v_limit := case when v_plan = 'pro' then 3 else 1 end;

    select count(*) into v_active
    from public.professionals p
    where p.business_id = v_business_id
      and p.is_active
      and p.id is distinct from new.id;

    if v_active >= v_limit then
      raise exception 'PLAN_LIMIT_EXCEEDED'
        using errcode = 'P0001',
        hint = 'Upgrade the plan to increase the professional limit.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_plan_professional_limit() from public, anon, authenticated, service_role;

drop trigger if exists enforce_plan_professional_limit on public.professionals;
create trigger enforce_plan_professional_limit
  before insert or update on public.professionals
  for each row execute function public.enforce_plan_professional_limit();
