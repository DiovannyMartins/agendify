-- Migration 0008: public read policies for the booking flow.
-- §13.1: the public business profile and active services are limited reads served
-- through the server layer. Anonymous/authenticated users may only read *active*
-- businesses and *active* services, so the booking page can resolve a slug and list
-- services without exposing private data.

create policy businesses_select_public on public.businesses
  for select to anon, authenticated
  using (is_active = true);

create policy services_select_public on public.services
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.is_active = true
    )
    and is_active = true
  );
