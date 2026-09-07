-- Migration 0037: endurecer o gate de plano na gestão da lista de espera (issue #22,
-- ADR 0008). Follows up on 0036, which introduced the owner-scoped notify/convert
-- RPCs. Managing the waitlist is a PROFISSIONAL feature, so the plan is enforced
-- inside the RPC itself (fail-closed) — a Free business cannot drive the
-- transitions through the API even if it bypassed the app boundary. This mirrors
-- the reminders RPC's `bus.plan = 'pro'` filter. Posture: security definer +
-- `set search_path = ''`, fully-qualified references.

create or replace function public.notify_waitlist_entry(p_entry_id uuid)
returns public.waitlist_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.waitlist_entries;
begin
  select * into v_entry
  from public.waitlist_entries
  where id = p_entry_id;

  if v_entry is null then
    raise exception 'WAITLIST_ENTRY_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = v_entry.business_id
      and b.owner_id = auth.uid()
  ) then
    raise exception 'WAITLIST_NOT_OWNER';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = v_entry.business_id
      and b.plan = 'pro'
  ) then
    raise exception 'WAITLIST_PRO_REQUIRED';
  end if;

  if v_entry.status = 'converted' then
    raise exception 'WAITLIST_ALREADY_CONVERTED';
  end if;
  if v_entry.status = 'cancelled' then
    raise exception 'WAITLIST_CANCELLED';
  end if;

  update public.waitlist_entries
  set status = 'notified'
  where id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function public.notify_waitlist_entry(uuid) from public, anon, service_role;
grant execute on function public.notify_waitlist_entry(uuid) to authenticated;

create or replace function public.convert_waitlist_entry(p_entry_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.waitlist_entries;
  v_booking public.bookings;
begin
  select * into v_entry
  from public.waitlist_entries
  where id = p_entry_id;

  if v_entry is null then
    raise exception 'WAITLIST_ENTRY_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = v_entry.business_id
      and b.owner_id = auth.uid()
  ) then
    raise exception 'WAITLIST_NOT_OWNER';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = v_entry.business_id
      and b.plan = 'pro'
  ) then
    raise exception 'WAITLIST_PRO_REQUIRED';
  end if;

  if v_entry.status = 'converted' then
    raise exception 'WAITLIST_ALREADY_CONVERTED';
  end if;
  if v_entry.status = 'cancelled' then
    raise exception 'WAITLIST_CANCELLED';
  end if;
  if v_entry.start_at <= now() then
    raise exception 'WAITLIST_PAST_SLOT';
  end if;

  select * into v_booking
  from public.create_booking(
    p_business_id := v_entry.business_id,
    p_service_id := v_entry.service_id,
    p_start_at := v_entry.start_at,
    p_customer_name := v_entry.customer_name,
    p_customer_phone := v_entry.customer_phone,
    p_customer_email := v_entry.customer_email
  );

  update public.waitlist_entries
  set status = 'converted'
  where id = p_entry_id;

  return v_booking;
end;
$$;

revoke all on function public.convert_waitlist_entry(uuid) from public, anon, service_role;
grant execute on function public.convert_waitlist_entry(uuid) to authenticated;
