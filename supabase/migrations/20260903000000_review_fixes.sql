-- Migration 0019: review fixes
-- Addresses findings from the Postgres best-practices review:
--   * Missing FK index on bookings.service_id / (business_id, service_id).
--   * Redundant single-column FKs on bookings.service_id (booking_service_id_fk
--     and the auto-named inline bookings_service_id_fkey) — superseded by the
--     composite bookings_service_business_fkey in migration 0013.
--   * Rate limiter clean-up without an index on window_start.
--   * Advisory locks using 32-bit hashtext (collision-prone); switch to 64-bit
--     hashtextextended for the overlap triggers and the rate limiter.
--   * No unique guard on availability so its insert is genuinely idempotent.

-- ===========================================================================
-- 1. Index the booking service FKs (Postgres does not auto-index FK columns).
-- ===========================================================================
create index if not exists idx_bookings_business_service
  on public.bookings (business_id, service_id);

-- ===========================================================================
-- 2. Drop the redundant single-column FKs. The composite
--    bookings_service_business_fkey (migration 0013) already enforces that a
--    booking's service exists and belongs to the same business.
-- ===========================================================================
alter table public.bookings
  drop constraint if exists booking_service_id_fk,
  drop constraint if exists bookings_service_id_fkey;

-- ===========================================================================
-- 3. Rate limiter cleanup: index window_start so the periodic delete of expired
--    buckets does not scan the whole table.
-- ===========================================================================
create index if not exists idx_booking_rate_limits_window_start
  on public.booking_rate_limits (window_start);

-- ===========================================================================
-- 4. Switch advisory locks to 64-bit keys to avoid collisions between distinct
--    business ids. Attribute/posture preserved: SECURITY INVOKER + '' search_path.
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
-- 5. Same 64-bit key for the rate limiter advisory lock. Server-only posture kept.
-- ===========================================================================
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

  perform pg_advisory_xact_lock(hashtextextended('rl:' || p_key, 0));

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

-- ===========================================================================
-- 6. Unique guard on availability so faixa starts cannot be duplicated and the
--    seed's `on conflict do nothing` is genuinely idempotent.
-- ===========================================================================
alter table public.availability
  add constraint availability_business_weekday_start_key
  unique (business_id, weekday, start_time);
