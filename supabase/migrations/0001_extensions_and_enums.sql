-- Migration 0001: extensions and enums
-- §20.4 step 1: enable required extensions and create the booking_status enum.

create extension if not exists "btree_gist";
create extension if not exists "pgcrypto";

create type booking_status as enum ('confirmed', 'completed', 'cancelled', 'no_show');
