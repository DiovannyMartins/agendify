-- Migration 0004: indexes, check constraints and the no-overlap exclusion constraint
-- §20.4 step 4. Follows §8.9 and §8.10.

-- §8.9 indexes
create index if not exists idx_services_business_active on public.services (business_id, is_active);
create index if not exists idx_availability_business_weekday_active on public.availability (business_id, weekday, is_active);
create index if not exists idx_blocks_business_start_end on public.availability_blocks (business_id, start_at, end_at);
create index if not exists idx_bookings_business_start on public.bookings (business_id, start_at);
create index if not exists idx_bookings_customer_created on public.bookings (customer_id, created_at desc);

-- §8.10 exclusion constraint: prevent overlapping active bookings within a business.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    business_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status <> 'cancelled');
