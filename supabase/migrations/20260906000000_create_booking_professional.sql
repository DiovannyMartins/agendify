-- Migration 0022: create_booking aceita p_professional_id (T03)
-- Following ADR 0006. The transactional RPC now accepts an optional
-- p_professional_id (uuid, default null) and binds the reservation to that
-- professional. When omitted, the business's default professional (the owner —
-- earliest-created, the same rule the T02 triggers use) is resolved server-side.
--
-- The RPC validates the chosen professional: it must exist, belong to the same
-- business and be active. A booking can never be bound to another business's
-- professional (SECURITY DEFINER bypasses RLS, so this is enforced in the body).
-- Snapshots (service name/duration/price) and public_code still come from the
-- re-read active service and the column default, so the prior contract is
-- unchanged. Per-professional overlap stays enforced by the bookings_no_overlap
-- exclusion constraint (booking×booking) and the prevent_booking_block_overlap
-- trigger (block×booking).
--
-- `create or replace` cannot change the argument list, so the obsolete
-- 7-parameter overload is dropped and recreated with 8 parameters; the grants
-- are re-issued against the new signature.

drop function if exists public.create_booking(uuid, uuid, timestamptz, text, text, text, text);

create or replace function public.create_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_customer_note text default null,
  p_professional_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_customer public.customers;
  v_professional public.professionals;
  v_professional_id uuid;
  v_booking public.bookings;
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

  -- 3. Resolve and validate the professional. When a professional is given it
  --    must exist, belong to this business and be active. When omitted, fall
  --    back to the business's default professional (earliest-created), which
  --    T01 guarantees to exist.
  if p_professional_id is not null then
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
    v_professional_id := v_professional.id;
  else
    select pr.id into v_professional_id
    from public.professionals pr
    where pr.business_id = p_business_id
    order by pr.created_at asc, pr.id asc
    limit 1;
    if v_professional_id is null then
      raise exception 'PROFESSIONAL_NOT_FOUND';
    end if;
  end if;

  -- 4. Upsert customer by (business_id, phone) on the validated service business.
  insert into public.customers (business_id, name, phone, email)
  values (v_service.business_id, p_customer_name, p_customer_phone, p_customer_email)
  on conflict (business_id, phone)
  do update set name = excluded.name, email = coalesce(excluded.email, public.customers.email)
  returning * into v_customer;

  -- 5. Insert booking. All snapshots recomputed server-side from the validated
  --    service; identity fields (including professional_id) derive from the
  --    validated inputs, never from the caller. Per-professional overlap is
  --    enforced by the exclusion constraint and the block-overlap trigger.
  insert into public.bookings (
    business_id,
    service_id,
    professional_id,
    customer_id,
    customer_name_snapshot,
    customer_phone_snapshot,
    customer_email_snapshot,
    service_name_snapshot,
    duration_minutes_snapshot,
    price_cents_snapshot,
    start_at,
    end_at,
    customer_note
  )
  values (
    v_service.business_id,
    v_service.id,
    v_professional_id,
    v_customer.id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    v_service.name,
    v_service.duration_minutes,
    v_service.price_cents,
    p_start_at,
    p_start_at + make_interval(mins => v_service.duration_minutes),
    p_customer_note
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

-- Strictly server-only: revoke the new signature from PUBLIC (all roles) and the
-- roles the default privileges had granted explicitly; grant only to service_role.
revoke all on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text, uuid) to service_role;
