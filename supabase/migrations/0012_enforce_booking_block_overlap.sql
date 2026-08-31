-- Migration 0012: complete the §9.4 rule for the booking side and close the
-- TOCTOU window. Migration 0011 only guarded blocks against books, so a booking
-- could still be inserted overlapping a block, and its exists() check raced under
-- concurrency. Both block and booking writes now serialize per business via an
-- advisory transaction lock, so concurrent inserts of the same business cannot
-- both pass the overlap check.

create or replace function public.prevent_block_booking_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
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
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.business_id::text));
  if exists (
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

create trigger enforce_booking_block_overlap
  before insert or update on public.bookings
  for each row
  execute function public.prevent_booking_block_overlap();
