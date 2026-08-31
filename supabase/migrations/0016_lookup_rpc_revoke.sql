-- Migration 0016: lock down the public booking lookup to the service role.
-- §16: the public confirmation/consultation screen resolves a reservation by its
-- random public_code. The lookup is SECURITY DEFINER (anon RLS would block the
-- join to bookings), so by default PostgreSQL grants EXECUTE to PUBLIC — exposing
-- a capability endpoint directly via /rest/v1/rpc/get_booking_by_public_code.
-- As with create_booking (§11.4 / §13.3), all public access must go through the
-- server layer. Revoke from PUBLIC (covers anon + authenticated) and grant only
-- to service_role, which the Next.js server uses via the admin client.

revoke all on function public.get_booking_by_public_code(uuid) from public;

grant execute on function public.get_booking_by_public_code(uuid) to service_role;
