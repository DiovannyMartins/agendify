-- Migration 0003: services, availability, availability_blocks, customers, bookings
-- §20.4 step 3. Follows §8.4 through §8.8.

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  duration_minutes smallint not null check (duration_minutes > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  constraint availability_time_ordered check (end_time > start_time)
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  constraint block_time_ordered check (end_at > start_at)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_business_phone_unique unique (business_id, phone)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null references public.services (id),
  customer_id uuid not null references public.customers (id),
  customer_name_snapshot text not null,
  customer_phone_snapshot text not null,
  customer_email_snapshot text,
  service_name_snapshot text not null,
  duration_minutes_snapshot smallint not null,
  price_cents_snapshot integer not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status booking_status not null default 'confirmed',
  public_code uuid not null unique default gen_random_uuid(),
  customer_note text check (customer_note is null or char_length(customer_note) <= 500),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_time_ordered check (end_at > start_at),
  constraint booking_service_id_fk foreign key (service_id) references public.services (id)
);
