-- Migration 0002: profiles and businesses
-- §20.4 step 2. Follows §8.2 and §8.3.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MongoDB-style updated_at is kept by an application/trigger.
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 500),
  phone text not null,
  timezone text not null,
  slot_interval_minutes smallint not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  min_notice_minutes integer not null default 120 check (min_notice_minutes between 0 and 10080),
  booking_window_days smallint not null default 60 check (booking_window_days between 1 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
