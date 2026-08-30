-- Migration 0010: expose the business timezone to the public confirmation page.
-- §9.5 / §16.1: the confirmation page shows service, date/time and business contact in
-- the business's own IANA timezone. Add business_timezone to the lookup function. The
-- return type changed, so the existing function must be dropped and recreated.

drop function if exists public.get_booking_by_public_code(uuid);

create function public.get_booking_by_public_code(p_code uuid)
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
set search_path = public
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

grant execute on function public.get_booking_by_public_code(uuid) to anon;
