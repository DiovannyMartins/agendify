-- Migration 0009: lock down create_booking so only the service role can call it.
-- §11.4 / §13.3: the public flow must go through the server layer, which revalidates
-- all domain rules before calling the RPC. By default PostgreSQL grants EXECUTE to
-- PUBLIC, which would let the anon role call it directly and bypass validation.
-- We revoke from PUBLIC (covers anon + authenticated) and grant only to service_role.

revoke all on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) from public;

grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) to service_role;
