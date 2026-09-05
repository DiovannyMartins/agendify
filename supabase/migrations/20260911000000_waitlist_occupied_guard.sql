-- Migration 0031: INC-3 follow-up — waitlist only for a genuinely occupied slot.
-- Refines `join_waitlist` from 0030: a waitlist entry is the customer who wanted
-- a slot they LOST, so the slot must actually be taken by an active (non-cancelled)
-- booking at insert time. Without this, a free, bookable slot could be polluted
-- with "help me wait" entries the customer should just book. Same SECURITY
-- DEFINER / `set search_path = ''` / service_role-only posture as 0030.

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

  -- 4. Only a still-future slot can be waited on, and it must be genuinely
  --    occupied — a waitlist is for the slot the customer wanted but lost. A
  --    free, bookable slot is not a waitlist case (the customer should just book
  --    it).
  if p_start_at <= now() then
    raise exception 'WAITLIST_PAST_SLOT';
  end if;

  if not exists (
    select 1
    from public.bookings b
    where b.professional_id = p_professional_id
      and b.status <> 'cancelled'
      and tstzrange(b.start_at, b.end_at, '[)') @> p_start_at
  ) then
    raise exception 'WAITLIST_SLOT_NOT_OCCUPIED';
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
