-- Migration 0006: Row Level Security and policies
-- §20.4 step 6. Follows §13.1 (access matrix) and §13.2 (conceptual policies).

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;

-- profiles: a user only sees/edits their own profile.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete_own on public.profiles
  for delete using (id = auth.uid());

-- businesses: owner-only.
create policy businesses_select_own on public.businesses
  for select using (owner_id = auth.uid());
create policy businesses_insert_own on public.businesses
  for insert with check (owner_id = auth.uid());
create policy businesses_update_own on public.businesses
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy businesses_delete_own on public.businesses
  for delete using (owner_id = auth.uid());

-- Shared helper predicate for child tables (services, availability, blocks, customers, bookings).
-- A user may only touch rows owned by their businesses.
create policy services_select_own on public.services
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy services_insert_own on public.services
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy services_update_own on public.services
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy services_delete_own on public.services
  for delete using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create policy availability_select_own on public.availability
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy availability_insert_own on public.availability
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy availability_update_own on public.availability
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy availability_delete_own on public.availability
  for delete using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create policy blocks_select_own on public.availability_blocks
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy blocks_insert_own on public.availability_blocks
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy blocks_update_own on public.availability_blocks
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy blocks_delete_own on public.availability_blocks
  for delete using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create policy customers_select_own on public.customers
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy customers_insert_own on public.customers
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );

create policy bookings_select_own on public.bookings
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy bookings_update_own on public.bookings
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
create policy bookings_insert_own on public.bookings
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
  );
