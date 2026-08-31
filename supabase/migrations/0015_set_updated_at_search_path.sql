-- Migration 0015: pin search_path on the updated_at trigger helper.
-- set_updated_at was created with no explicit search_path, so it ran with the
-- caller's mutable search_path (flagged by the function_search_path_mutable
-- advisor). It only uses now() (pg_catalog), so there was no injection surface,
-- but pinning search_path to '' removes the warning and matches the hardening
-- applied to all other functions.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
