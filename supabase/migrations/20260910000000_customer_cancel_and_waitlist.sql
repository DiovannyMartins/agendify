-- Migration 0030: INC-3 — cancelamento self-service + lista de espera.
-- Follows the ADRs and the security-definer + `set search_path = ''` posture of
-- the RPC/trigger migrations (e.g. 0007, 0013, 0020, 0021, 0025), with
-- fully-qualified references.
--
-- The customer self-service cancel is authorized in the app layer by a token
-- derived from the booking's `public_code` (HMAC-SHA256 with a server-only
-- secret, see `lib/bookings/cancel.ts`). This migration only owns the atomic
-- state transition so a booking never changes status twice or from a terminal
-- state: `cancel_booking_by_public_code` flips a `confirmed` booking to
-- `cancelled` (service_role-only, so the secret never needs to live in the DB).
--
-- The waitlist stores what a customer wanted when their preferred slot was
-- occupied: business + professional + service + the UTC instant (ADR 0003) +
-- the contact details. `join_waitlist` validates ownership/active state and
-- de-duplicates by (professional, service, start_at, phone) so the same customer
-- doesn't fill the queue for one slot. `get_waitlist_for_slot` exposes the
-- pending entries for a freed slot — a seam for the future notify/promote step
-- (no automatic promotion here: that is a separate feature).

-- ===========================================================================
-- 1. waitlist_entries table.
-- ===========================================================================
create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  start_at timestamptz not null,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_phone text not null check (char_length(customer_phone) between 8 and 20),
  customer_email text check (customer_email is null or char_length(customer_email) <= 200),
  status text not null default 'pending' check (status in ('pending', 'notified', 'converted', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint waitlist_entries_duplicate unique (professional_id, service_id, start_at, customer_phone)
);

alter table public.waitlist_entries enable row level security;

-- The owner may read the waitlist of their own business (mirrors the businesses
-- owner policy). Writes are service_role-only (the RPC below); the RLS stays
-- deny-by-default for every other role.
create policy waitlist_entries_owner_select
on public.waitlist_entries
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = waitlist_entries.business_id
      and b.owner_id = auth.uid()
  )
);

-- Pending entries for a professional+slot are the promotion scan; keep them
-- indexable (only pending/notified rows matter for the scan).
create index if not exists waitlist_entries_slot_pending_idx
on public.waitlist_entries (professional_id, start_at)
where status in ('pending', 'notified');

-- ===========================================================================
-- 2. cancel_booking_by_public_code: atomic confirmed -> cancelled.
--    service_role-only; the caller (server action) has already verified the
--    derived cancel token against the booking's public_code.
-- ===========================================================================
create or replace function public.cancel_booking_by_public_code(
  p_code uuid,
  p_cancel_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking
  from public.bookings
  where public_code = p_code
  for update;

  if v_booking is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancel_reason = nullif(p_cancel_reason, ''),
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.cancel_booking_by_public_code(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_booking_by_public_code(uuid, text) to service_role;

-- ===========================================================================
-- 3. join_waitlist: validate + insert a waitlist entry (dedup by slot+phone).
--    The customer may omit an e-mail (some businesses only take phone), and a
--    re-join of the same (slot, phone) refreshes the contact + returns the
--    existing row rather than duplicating the queue.
-- ===========================================================================
create or replace function public.join_waitlist(
  p_business_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null
)
returns public.waitlist_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_professional public.professionals;
  v_entry public.waitlist_entries;
begin
  -- 1. Business must exist and be active.
  select * into v_business
  from public.businesses
  where id = p_business_id;
  if v_business is null then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;
  if not v_business.is_active then
    raise exception 'BUSINESS_INACTIVE';
  end if;

  -- 2. Service must exist, belong to the same business, and be active.
  select * into v_service
  from public.services
  where id = p_service_id;
  if v_service is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;
  if v_service.business_id <> p_business_id then
    raise exception 'SERVICE_BUSINESS_MISMATCH';
  end if;
  if not v_service.is_active then
    raise exception 'SERVICE_INACTIVE';
  end if;

  -- 3. Professional must exist, belong to the same business, and be active.
  select * into v_professional
  from public.professionals
  where id = p_professional_id;
  if v_professional is null then
    raise exception 'PROFESSIONAL_NOT_FOUND';
  end if;
  if v_professional.business_id <> p_business_id then
    raise exception 'PROFESSIONAL_BUSINESS_MISMATCH';
  end if;
  if not v_professional.is_active then
    raise exception 'PROFESSIONAL_INACTIVE';
  end if;

  -- 4. Only a still-future slot can be waited on.
  if p_start_at <= now() then
    raise exception 'WAITLIST_PAST_SLOT';
  end if;

  -- 5. Upsert by (professional, service, start_at, phone). Re-pending a
  --    previously-cancelled entry is allowed (the customer re-joins); the
  --    original created_at is preserved so the queue is stable.
  insert into public.waitlist_entries (
    business_id,
    professional_id,
    service_id,
    start_at,
    customer_name,
    customer_phone,
    customer_email
  )
  values (
    p_business_id,
    p_professional_id,
    p_service_id,
    p_start_at,
    p_customer_name,
    p_customer_phone,
    nullif(p_customer_email, '')
  )
  on conflict (professional_id, service_id, start_at, customer_phone)
  do update set
    customer_name = excluded.customer_name,
    customer_email = coalesce(excluded.customer_email, public.waitlist_entries.customer_email),
    status = 'pending'
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function public.join_waitlist(uuid, uuid, uuid, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist(uuid, uuid, uuid, timestamptz, text, text, text) to service_role;

-- ===========================================================================
-- 4. get_waitlist_for_slot: pending/notified entries for a freed slot (seam).
--    The notify/promote step will read these and contact the customer; it is
--    deliberately NOT wired to auto-create a booking (that would race another
--    reservation on the same slot).
-- ===========================================================================
create or replace function public.get_waitlist_for_slot(
  p_professional_id uuid,
  p_start_at timestamptz
)
returns table (
  id uuid,
  business_id uuid,
  professional_id uuid,
  service_id uuid,
  start_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_email text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    e.id,
    e.business_id,
    e.professional_id,
    e.service_id,
    e.start_at,
    e.customer_name,
    e.customer_phone,
    e.customer_email,
    e.status,
    e.created_at
  from public.waitlist_entries e
  where e.professional_id = p_professional_id
    and e.start_at = p_start_at
    and e.status in ('pending', 'notified')
  order by e.created_at asc, e.id asc;
end;
$$;

revoke all on function public.get_waitlist_for_slot(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.get_waitlist_for_slot(uuid, timestamptz) to service_role;
