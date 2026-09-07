-- Migration 0036: gestão da lista de espera no dashboard (issue #22, ADR 0008).
-- The waitlist is a PROFISSIONAL feature on the management side (the public join
-- stays free): the dashboard lists the business's entries (owner SELECT via RLS,
-- already present) and drives the two state transitions — notify and convert to a
-- booking. The owner has only SELECT on waitlist_entries, so these transitions
-- live in security-definer RPCs that check ownership via auth.uid() and are
-- granted to `authenticated`; they mirror the posture of `cancel_booking_by_public_code`
-- and `join_waitlist` (fully-qualified, set search_path = '').
--
--   * notify_waitlist_entry(p_entry_id) — pending -> notified (idempotent for
--     notified; rejects converted/cancelled).
--   * convert_waitlist_entry(p_entry_id) — creates a booking for the customer's
--     desired slot (reusing `create_booking`, which enforces the active business,
--     the service and the no-overlap constraint) and marks the entry converted.
--     If the slot was re-taken or passed, the whole call errors and the entry is
--     left untouched.

-- ===========================================================================
-- 1. notify_waitlist_entry: owner marks a pending/notified entry as notified.
-- ===========================================================================
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

-- ===========================================================================
-- 2. convert_waitlist_entry: create the booking for the customer's desired slot
--    and mark the entry converted. The create is delegated to `create_booking`
--    (which is service_role-only) — the outer function is security definer, so it
--    can call it as the function owner. If the slot is now taken or blocked the
--    create raises and the transaction aborts, leaving the entry unconverted.
-- ===========================================================================
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
