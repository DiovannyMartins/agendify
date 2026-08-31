-- Migration 0013: security remediation for create_booking and the function-grant posture.
-- §11.4 / §13.3 risk discovered in audit:
--   * Default privileges on role `postgres` in schema `public` grant EXECUTE on new
--     functions to anon, authenticated and service_role. Migration 0009 revoked only
--     PUBLIC, which removed the inherited grant but NOT the explicit anon/authenticated
--     grants created by those defaults. As a result anon/authenticated could call
--     public.create_booking directly (a SECURITY DEFINER run as postgres, bypassing RLS),
--     e.g. POST /rest/v1/rpc/create_booking.
--   * create_booking had no secure search_path and did not validate business/service
--     integrity (service belonging to the business, business active, service active).

-- ===========================================================================
-- 1. Hardened create_booking
--    server-only entry point. SECURITY DEFINER is required so the public flow
--    (server action -> service_role) can atomically persist customer + booking.
--    The function no longer trusts its inputs: it re-validates the business, the
--    service's ownership and active state, and recomputes the end_at/duration.
--    search_path is emptied and all objects are schema-qualified.
-- ===========================================================================

create or replace function public.create_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_customer_note text default null
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

  -- 3. Upsert customer by (business_id, phone) on the validated service business.
  insert into public.customers (business_id, name, phone, email)
  values (v_service.business_id, p_customer_name, p_customer_phone, p_customer_email)
  on conflict (business_id, phone)
  do update set name = excluded.name, email = coalesce(excluded.email, public.customers.email)
  returning * into v_customer;

  -- 4. Insert booking. All snapshots recomputed server-side from the validated
  --    service; identity fields derive from the service, never from the caller.
  insert into public.bookings (
    business_id,
    service_id,
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

-- Strictly server-only: revoke from PUBLIC (covers all roles) AND from the roles
-- that the default privileges had granted explicitly. Grant only to service_role.
revoke all on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) to service_role;

-- ===========================================================================
-- 2. Hardened SECURITY DEFINER trigger functions
--    search_path is emptied; all relations are schema-qualified. The overlap
--    checks keep the postgres-owner (bypassrls) context so they apply regardless
--    of the caller. They remain executable by the roles that legitimately fire
--    them (owner sessions use `authenticated`, admin/booking flow uses
--    `service_role`); PUBLIC and anon are revoked so they are not exposed as RPCs.
-- ===========================================================================

create or replace function public.prevent_block_booking_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.business_id::text));
  if exists (
    select 1
    from public.bookings b
    where b.business_id = new.business_id
      and b.status <> 'cancelled'
      and tstzrange(new.start_at, new.end_at, '[)') && tstzrange(b.start_at, b.end_at, '[)')
  ) then
    raise exception 'BLOCK_BOOKING_OVERLAP';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_booking_block_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.business_id::text));
  if new.status <> 'cancelled' and exists (
    select 1
    from public.availability_blocks bl
    where bl.business_id = new.business_id
      and tstzrange(new.start_at, new.end_at, '[)') && tstzrange(bl.start_at, bl.end_at, '[)')
  ) then
    raise exception 'BOOKING_BLOCK_OVERLAP';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_block_booking_overlap() from public, anon;
revoke all on function public.prevent_booking_block_overlap() from public, anon;

-- ===========================================================================
-- 3. get_booking_by_public_code: still intentionally public (confirmation page).
--    search_path hardened; only the PUBLIC grant is removed, anon/authenticated
--    (granted by default privileges) keep EXECUTE so the public lookup works.
-- ===========================================================================

create or replace function public.get_booking_by_public_code(p_code uuid)
returns table (
  service_name text,
  start_at timestamptz,
  end_at timestamptz,
  business_name text,
  business_slug text,
  business_phone text,
  business_timezone text
)
language sql
security definer
set search_path = ''
as $$
  select
    b.service_name_snapshot,
    b.start_at,
    b.end_at,
    bus.name,
    bus.slug,
    bus.phone,
    bus.timezone
  from public.bookings b
  join public.businesses bus on bus.id = b.business_id
  where b.public_code = p_code
$$;

revoke all on function public.get_booking_by_public_code(uuid) from public;

-- ===========================================================================
-- 4. Deny-by-default for new functions created by `postgres` in `public`.
--    Root cause of the create_booking exposure: default privileges granted
--    EXECUTE to anon/authenticated/service_role for every new function. Future
--    functions must be granted EXECUTE explicitly by a migration. This only
--    affects objects created AFTER this migration; existing grants are untouched.
-- ===========================================================================

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

-- ===========================================================================
-- 5. Integrity: a booking's service must belong to its business.
--    Enforced with a composite unique + composite FK so the mismatch is
--    impossible at rest, independent of the RPC or application layer.
-- ===========================================================================

alter table public.services
  add constraint services_id_business_id_key unique (id, business_id);

alter table public.bookings
  add constraint bookings_service_business_fkey
  foreign key (service_id, business_id)
  references public.services (id, business_id);

-- ===========================================================================
-- 6. Rate limiting against reservation flooding.
--    A dependency-free, shared, durable limiter hosted in Postgres. The server
--    action calls check_booking_rate_limit (service_role-only) before creating a
--    booking; the keys include IP + business and a business-wide aggregate so
--    the limiter does not rely only on the (attacker-controlled) phone number.
-- ===========================================================================

create table if not exists public.booking_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null default 0
);

alter table public.booking_rate_limits enable row level security;

create or replace function public.check_booking_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz;
  v_bucket timestamptz;
  v_count integer;
begin
  if p_window_seconds < 1 then
    p_window_seconds := 1;
  end if;

  v_cutoff := now() - make_interval(secs => p_window_seconds);
  v_bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  -- serialize per key so concurrent attempts cannot all pass
  perform pg_advisory_xact_lock(hashtext('rl:' || p_key));

  -- opportunistically drop expired buckets
  delete from public.booking_rate_limits where window_start < v_cutoff;

  insert into public.booking_rate_limits (key, window_start, count)
  values (p_key, v_bucket, 1)
  on conflict (key) do update set
    count = case when public.booking_rate_limits.window_start = v_bucket
                 then public.booking_rate_limits.count + 1
                 else 1 end,
    window_start = case when public.booking_rate_limits.window_start = v_bucket
                        then public.booking_rate_limits.window_start
                        else v_bucket end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_booking_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_booking_rate_limit(text, integer, integer) to service_role;
