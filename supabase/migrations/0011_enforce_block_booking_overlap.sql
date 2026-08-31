-- Migration 0011: enforce the §9.4 block/booking no-overlap rule at the database
-- layer. The server action (createBlock) already blocks overlapping blocks, but a
-- direct/admin write could bypass it. Following the no-overlap philosophy of
-- bookings_no_overlap (§8.10), the rule is enforced where the data lives so
-- integrity holds regardless of caller.

create or replace function public.prevent_block_booking_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

create trigger enforce_block_booking_overlap
  before insert or update on public.availability_blocks
  for each row
  execute function public.prevent_block_booking_overlap();
