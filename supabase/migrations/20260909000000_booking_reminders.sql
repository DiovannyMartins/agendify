-- Migration 0025: lembretes por e-mail (INC-2, Pro feature).
-- Follows ADR 0007 (Pro gate) and ADR 0003 (UTC/IANA timezone), and the
-- security-definer + `set search_path = ''` posture of the RPC/trigger
-- migrations (e.g. 0007, 0013, 0020, 0021), with fully-qualified references.
--
-- The core seam is small and testable:
--   * public.bookings.reminder_sent_at:
--       the dedup guard — a booking is reminded at most once.
--   * public.get_due_booking_reminders(p_lead_minutes):
--       the candidates for a Pro business (confirmed, future, within the lead,
--       has a customer e-mail, and not yet reminded).
--   * public.set_booking_reminders_sent(p_booking_ids):
--       marks a set of bookings as reminded (called by the sender AFTER a
--       successful delivery).
--
-- The dispatch wiring (pg_cron -> pg_net -> Edge Function) is DEFENSIVE: it is a
-- no-op until an operator configures `app.reminder_cron_url` /
-- `app.reminder_cron_secret` (via ALTER ROLE / set_config). Nothing is sent and
-- nothing is marked without that configuration, so enabling the schedule never
-- breaks the migration push and never sends an unexpected e-mail.
--
-- Sending is at-least-once: an e-mail is marked sent only after delivery, so a
-- transient failure is retried on the next tick (acceptable for reminders).

-- ===========================================================================
-- 1. Dedup guard on bookings.
-- ===========================================================================
alter table public.bookings
  add column if not exists reminder_sent_at timestamptz;

-- ===========================================================================
-- 2. Candidates for a reminder (Pro only, service-role RPC).
--    `security definer` so the cron/edge caller (service_role, no owner uid) can
--    read across bookings + businesses without RLS. `set search_path = ''` with
--    fully-qualified references per the 0014/0019 posture.
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
  public_code uuid
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

-- ===========================================================================
-- 3. Mark a batch of bookings as reminded (called by the sender after delivery).
--    Only still-confirmed, not-yet-reminded bookings are touched, so a re-run is
--    idempotent.
-- ===========================================================================
create or replace function public.set_booking_reminders_sent(p_booking_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
  set reminder_sent_at = now()
  where id = any(p_booking_ids)
    and status = 'confirmed'
    and reminder_sent_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.set_booking_reminders_sent(uuid[]) from public, anon, authenticated;
grant execute on function public.set_booking_reminders_sent(uuid[]) to service_role;

-- ===========================================================================
-- 4. Dispatch wiring (defensive). Build the JSON payload of due candidates and
--    POST it to the reminder Edge Function via pg_net. Without the configured
--    URL + secret it is a no-op (returns 0 and raises a NOTICE).
-- ===========================================================================
create or replace function public.process_booking_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := current_setting('app.reminder_cron_url', true);
  v_secret text := current_setting('app.reminder_cron_secret', true);
  v_payload jsonb;
  v_count integer;
begin
  if v_url is null or v_secret is null then
    raise notice 'booking_reminders: no cron url/secret configured; nothing dispatched';
    return 0;
  end if;

  select jsonb_agg(to_jsonb(row))
  into v_payload
  from public.get_due_booking_reminders(1440) as row;

  if v_payload is null then
    return 0;
  end if;

  begin
    perform net.http_post(
      url := v_url,
      body := v_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      )
    );
  exception when others then
    raise notice 'booking_reminders: dispatch failed (%); %', sqlstate, sqlerrm;
    return 0;
  end;

  select jsonb_array_length(v_payload) into v_count;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.process_booking_reminders() from public, anon, authenticated;
grant execute on function public.process_booking_reminders() to service_role;

-- ===========================================================================
-- 5. Enable the scheduling extension (guarded so a plan without pg_cron/pg_net
--    cannot abort the push) and register the recurring tick.
-- ===========================================================================
do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
exception when others then
  raise notice 'booking_reminders: extensions pg_cron/pg_net unavailable (%). Plan gate and RPCs are unaffected; the cron was not scheduled.', sqlerrm;
end;
$$;

do $$
begin
  perform cron.unschedule('booking-reminders');
exception when others then
  -- job not yet registered; safe to proceed to schedule.
  null;
end;
$$;

do $$
begin
  perform cron.schedule(
    'booking-reminders',
    'every 30 minutes',
    $cron$select public.process_booking_reminders()$cron$
  );
exception when others then
  raise notice 'booking_reminders: cron not scheduled (%). %', sqlstate, sqlerrm;
end;
$$;
