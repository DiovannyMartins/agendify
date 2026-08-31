-- Migration 0014: remove the remaining SECURITY DEFINER-by-authenticated surface.
-- The overlap trigger functions were SECURITY DEFINER, so a signed-in
-- (authenticated) user could invoke them as an RPC with postgres privileges.
-- They are only meant to run as triggers. SECURITY INVOKER makes them run with
-- the DML caller's privileges, which is provably equivalent here: the caller
-- (owner via authenticated, or postgres via the create_booking definer) is
-- ALWAYS the owner of the business whose rows are being checked, so RLS scopes
-- the overlap probe to exactly the same business. Triggers keep working.

create or replace function public.prevent_block_booking_overlap()
returns trigger
language plpgsql
security invoker
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
security invoker
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

-- They are no longer security definer, so the SECURITY DEFINER advisor finding
-- is gone. Keep EXECUTE for the roles that fire them (owner sessions and the
-- service-role booking flow); PUBLIC and anon stay revoked.
revoke all on function public.prevent_block_booking_overlap() from public, anon;
grant execute on function public.prevent_block_booking_overlap() to authenticated, service_role;
revoke all on function public.prevent_booking_block_overlap() from public, anon;
grant execute on function public.prevent_booking_block_overlap() to authenticated, service_role;
