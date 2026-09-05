-- Migration 0028: helper compartilhado find_default_professional (refactor)
-- Extracts the repeated "default professional = earliest-created (order by
-- created_at asc, id asc limit 1)" rule T01/T02/T03 inlined in many places into
-- one function, so it is defined once and reused. Purely a dedup refactor: it
-- does not change any behaviour, only removes duplication.
--
-- Posture (0014/0019): security invoker + set search_path = '', fully qualified.
-- `create or replace` preserves existing grants, so no re-grant is needed for the
-- triggers/functions we re-define below. The backfill UPDATEs in 0021 are left
-- as one-shot statements (they are idempotent history, not shared logic).

create or replace function public.find_default_professional(p_business_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select pr.id into v_id
  from public.professionals pr
  where pr.business_id = p_business_id
  order by pr.created_at asc, pr.id asc
  limit 1;
  return v_id;
end;
$$;

revoke all on function public.find_default_professional(uuid) from public, anon, authenticated, service_role;
grant execute on function public.find_default_professional(uuid) to service_role;

-- Refactor the live triggers/functions to use the helper instead of the inline subquery.
create or replace function public.ensure_professional_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.professional_id is null then
    new.professional_id := public.find_default_professional(new.business_id);
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_professional_id() from public, anon, authenticated, service_role;

create or replace function public.prevent_block_booking_overlap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.professional_id is null then
    new.professional_id := public.find_default_professional(new.business_id);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.professional_id::text, 0));
  if exists (
    select 1
    from public.bookings b
    where b.professional_id = new.professional_id
      and b.status <> 'cancelled'
      and tstzrange(new.start_at, new.end_at, '[)') && tstzrange(b.start_at, b.end_at, '[)')
  ) then
    raise exception 'BLOCK_BOOKING_OVERLAP';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_block_booking_overlap() from public, anon;
grant execute on function public.prevent_block_booking_overlap() to authenticated, service_role;

create or replace function public.prevent_booking_block_overlap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.professional_id is null then
    new.professional_id := public.find_default_professional(new.business_id);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.professional_id::text, 0));
  if new.status <> 'cancelled' and exists (
    select 1
    from public.availability_blocks bl
    where bl.professional_id = new.professional_id
      and tstzrange(new.start_at, new.end_at, '[)') && tstzrange(bl.start_at, bl.end_at, '[)')
  ) then
    raise exception 'BOOKING_BLOCK_OVERLAP';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_booking_block_overlap() from public, anon;
grant execute on function public.prevent_booking_block_overlap() to authenticated, service_role;

-- Migrate the create_booking RPC's fallback branch to the helper too.
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
  select * into v_business
  from public.businesses
  where id = p_business_id;
  if v_business is null then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;
  if not v_business.is_active then
    raise exception 'BUSINESS_INACTIVE';
  end if;

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
    v_professional_id := public.find_default_professional(p_business_id);
    if v_professional_id is null then
      raise exception 'PROFESSIONAL_NOT_FOUND';
    end if;
  end if;

  insert into public.customers (business_id, name, phone, email)
  values (v_service.business_id, p_customer_name, p_customer_phone, p_customer_email)
  on conflict (business_id, phone)
  do update set name = excluded.name, email = coalesce(excluded.email, public.customers.email)
  returning * into v_customer;

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

revoke all on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text, uuid) to service_role;
