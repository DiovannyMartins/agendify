-- Migration 0032: fix - find_default_professional must be executable by
-- authenticated. Migration 0028 revoked EXECUTE from anon and authenticated
-- (granting only service_role), but the SECURITY INVOKER trigger functions
-- (ensure_professional_id, prevent_block_booking_overlap,
-- prevent_booking_block_overlap) call it under the DML caller's role. When the
-- owner (authenticated) inserts a block/booking/availability in the dashboard,
-- those triggers run as authenticated, which now lacks EXECUTE on the helper, so
-- the write fails with `permission denied for function find_default_professional`
-- (42501).
--
-- Before 0028 the same logic was an inline SELECT on public.professionals, which
-- is granted to authenticated (0020), so granting EXECUTE to authenticated
-- restores the pre-refactor behaviour. anon never fires these triggers (no table
-- grant on professionals and RLS deny-by-default), so it stays revoked. The
-- public flow reaches the helper only through create_booking (SECURITY DEFINER),
-- which executes it as postgres.

grant execute on function public.find_default_professional(uuid) to authenticated;
