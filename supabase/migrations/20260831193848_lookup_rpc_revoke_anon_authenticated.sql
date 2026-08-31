-- Migration 0017: also revoke the explicit EXECUTE grants left to anon/authenticated.
-- The lookup function was granted to `anon` (migrations 0007/0010), not to PUBLIC,
-- so `revoke ... from public` alone left it callable via /rest/v1/rpc as anon.
-- Close that hole: the public confirmation/consultation screen must resolve a
-- reservation only through the Next.js server (service role), never directly.

revoke all on function public.get_booking_by_public_code(uuid) from anon;
revoke all on function public.get_booking_by_public_code(uuid) from authenticated;

grant execute on function public.get_booking_by_public_code(uuid) to service_role;
