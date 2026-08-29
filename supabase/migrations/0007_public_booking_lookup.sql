-- Migration 0007: public booking confirmation view (server-only, minimal data).
-- §8.8 / §16: the confirmation page reads only service, date/time and business contact,
-- never customer personal data. Uses a security-definer function so the public URL
-- (public_code) can be resolved without exposing bookings to anonymous RLS reads.

create or replace function public.get_booking_by_public_code(p_code uuid)
returns table (
  service_name text,
  start_at timestamptz,
  end_at timestamptz,
  business_name text,
  business_slug text,
  business_phone text
)
language sql
security definer
set search_path = public
as $$
  select
    b.service_name_snapshot,
    b.start_at,
    b.end_at,
    bus.name,
    bus.slug,
    bus.phone
  from public.bookings b
  join public.businesses bus on bus.id = b.business_id
  where b.public_code = p_code
$$;

grant execute on function public.get_booking_by_public_code(uuid) to anon;
