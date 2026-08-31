-- Migration 0017: normalize `availability.weekday` to ISO 8601 (1=Mon..7=Sun).
-- Previously the app used 0=Sun..6=Sat (JS Date.getDay()). Business owners
-- reported "day of week starts at 0"; the ISO convention is expected instead.
--
-- Mapping of existing rows:
--   old 0 (Sunday)  -> 7 (Sunday)
--   old 1..6 (Mon..Sat) -> 1..6 (unchanged, already Monday=1 .. Saturday=6)

-- Remap existing availability rows to the ISO convention.
update public.availability set weekday = 7 where weekday = 0;

-- Replace the check constraint (old range 0-6) with the ISO range 1-7.
alter table public.availability drop constraint if exists availability_weekday_check;
alter table public.availability add constraint availability_weekday_check check (weekday between 1 and 7);
