-- Migration 0017: normalize `availability.weekday` to ISO 8601 (1=Mon..7=Sun).
-- Previously the app used 0=Sun..6=Sat (JS Date.getDay()). Business owners
-- reported "day of week starts at 0"; the ISO convention is expected instead.
--
-- Mapping of existing rows:
--   old 0 (Sunday)  -> 7 (Sunday)
--   old 1..6 (Mon..Sat) -> 1..6 (unchanged, already Monday=1 .. Saturday=6)

-- First relax the old 0-6 check so existing rows can be remapped to the ISO
-- range (setting weekday=7 would otherwise violate the 0-6 constraint before we
-- could change it).
alter table public.availability drop constraint if exists availability_weekday_check;

-- Remap existing availability rows to the ISO convention.
update public.availability set weekday = 7 where weekday = 0;

-- Re-apply the check constraint with the ISO range 1-7.
alter table public.availability add constraint availability_weekday_check check (weekday between 1 and 7);
