-- Migration 0033: remover o modelo de equipe/profissionais e o gate de plano.
-- Reverts ADR 0006 (agenda por profissional) and ADR 0007 (gate de plano com
-- seam para Stripe). Collapses scheduling back to a single business level:
-- availability, blocks and bookings are scoped by `business_id` only, there is
-- no `professionals` table and no `businesses.plan`. The customer-facing
-- features (relatorios, lembretes, lista de espera, cancelamento self-service)
-- are KEPT and de-gated: relatorios/lembretes become free, and the waitlist is
-- re-anchored on `business_id` instead of `professional_id`.
--
-- This is a fresh migration that reverses an already-applied feature; it does
-- not edit the historical migrations. Posture: security invoker + set
-- search_path = '' (0014/0019) for the trigger functions, fully qualified.

-- ===========================================================================
-- 1. Drop the professional-scoped waitlist RPCs before altering the table.
-- ===========================================================================
drop function if exists public.get_waitlist_for_slot(uuid, timestamptz);
drop function if exists public.join_waitlist(uuid, uuid, uuid, timestamptz, text, text, text);

-- ===========================================================================
-- 2. De-gate the reminder candidates: no more `bus.plan = 'pro'`.
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
  where bk.status = 'confirmed'
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
-- 3. Drop the professional/plan trigger functions.
-- ===========================================================================
drop trigger if exists ensure_professional_id_availability on public.availability;
drop function if exists public.ensure_professional_id();

drop trigger if exists enforce_plan_professional_limit on public.professionals;
drop function if exists public.enforce_plan_professional_limit();

drop trigger if exists protect_business_plan on public.businesses;
drop function if exists public.protect_business_plan();

drop trigger if exists ensure_default_professional_on_business on public.businesses;
drop function if exists public.ensure_default_professional();

drop function if exists public.find_default_professional(uuid);

-- ===========================================================================
-- 4. Redefine the block/booking overlap triggers back to business-level.
--    Same posture as 0019: security invoker + '' search_path + 64-bit lock.
-- ===========================================================================
create or replace function public.prevent_block_booking_overlap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.business_id::text, 0));
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
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.business_id::text, 0));
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
grant execute on function public.prevent_block_booking_overlap() to authenticated, service_role;
revoke all on function public.prevent_booking_block_overlap() from public, anon;
grant execute on function public.prevent_booking_block_overlap() to authenticated, service_role;

-- ===========================================================================
-- 5. Waitlist: re-anchor on business_id.
-- ===========================================================================
alter table public.waitlist_entries
  drop constraint if exists waitlist_entries_professional_id_fkey;

alter table public.waitlist_entries
  drop constraint if exists waitlist_entries_duplicate;

drop index if exists waitlist_entries_slot_pending_idx;

alter table public.waitlist_entries
  drop column if exists professional_id;

alter table public.waitlist_entries
  add constraint waitlist_entries_duplicate
  unique (business_id, service_id, start_at, customer_phone);

create index if not exists waitlist_entries_slot_pending_idx
  on public.waitlist_entries (business_id, start_at)
  where status in ('pending', 'notified');

-- ===========================================================================
-- 6. Drop professional_id from the agenda tables and restore business-level
--    constraints.
-- ===========================================================================
alter table public.availability
  drop constraint if exists availability_professional_weekday_start_key;

alter table public.bookings
  drop constraint if exists bookings_no_overlap;

alter table public.availability
  drop constraint if exists availability_professional_business_fkey;

alter table public.availability_blocks
  drop constraint if exists blocks_professional_business_fkey;

alter table public.bookings
  drop constraint if exists bookings_professional_business_fkey;

drop index if exists idx_availability_professional;
drop index if exists idx_blocks_professional_start;
drop index if exists idx_bookings_professional_start;

alter table public.availability
  drop column if exists professional_id;

alter table public.availability_blocks
  drop column if exists professional_id;

alter table public.bookings
  drop column if exists professional_id;

alter table public.availability
  add constraint availability_business_weekday_start_key
  unique (business_id, weekday, start_time);

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    business_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status <> 'cancelled');

-- ===========================================================================
-- 7. Redefine create_booking to the business-level (7-arg) signature.
-- ===========================================================================
drop function if exists public.create_booking(uuid, uuid, timestamptz, text, text, text, text, uuid);

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

  insert into public.customers (business_id, name, phone, email)
  values (v_service.business_id, p_customer_name, p_customer_phone, p_customer_email)
  on conflict (business_id, phone)
  do update set name = excluded.name, email = coalesce(excluded.email, public.customers.email)
  returning * into v_customer;

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

revoke all on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) to service_role;

-- ===========================================================================
-- 8. Recreate the waitlist RPCs re-anchored on business_id.
-- ===========================================================================
create or replace function public.join_waitlist(
  p_business_id uuid,
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
  v_entry public.waitlist_entries;
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

  if p_start_at <= now() then
    raise exception 'WAITLIST_PAST_SLOT';
  end if;

  if not exists (
    select 1
    from public.bookings b
    where b.business_id = p_business_id
      and b.status <> 'cancelled'
      and tstzrange(b.start_at, b.end_at, '[)') @> p_start_at
  ) then
    raise exception 'WAITLIST_SLOT_NOT_OCCUPIED';
  end if;

  insert into public.waitlist_entries (
    business_id,
    service_id,
    start_at,
    customer_name,
    customer_phone,
    customer_email
  )
  values (
    p_business_id,
    p_service_id,
    p_start_at,
    p_customer_name,
    p_customer_phone,
    nullif(p_customer_email, '')
  )
  on conflict (business_id, service_id, start_at, customer_phone)
  do update set
    customer_name = excluded.customer_name,
    customer_email = coalesce(excluded.customer_email, public.waitlist_entries.customer_email),
    status = 'pending'
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function public.join_waitlist(uuid, uuid, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist(uuid, uuid, timestamptz, text, text, text) to service_role;

create or replace function public.get_waitlist_for_slot(
  p_business_id uuid,
  p_start_at timestamptz
)
returns table (
  id uuid,
  business_id uuid,
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
    e.service_id,
    e.start_at,
    e.customer_name,
    e.customer_phone,
    e.customer_email,
    e.status,
    e.created_at
  from public.waitlist_entries e
  where e.business_id = p_business_id
    and e.start_at = p_start_at
    and e.status in ('pending', 'notified')
  order by e.created_at asc, e.id asc;
end;
$$;

revoke all on function public.get_waitlist_for_slot(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.get_waitlist_for_slot(uuid, timestamptz) to service_role;

-- ===========================================================================
-- 9. Drop the professionals table and the plan column/enum.
-- ===========================================================================
drop table if exists public.professionals;

alter table public.businesses
  drop column if exists plan;

do $$
begin
  drop type if exists public.business_plan;
exception when dependent_objects_still_exist then
  raise notice 'business_plan enum still referenced; left in place.';
end;
$$;
