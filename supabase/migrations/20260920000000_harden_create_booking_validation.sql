-- Migration 0040: hardening da RPC create_booking — revalida antecedência mínima
-- (min_notice_minutes) no banco (defesa em profundidade).
--
-- Causa raiz: create_booking (SECURITY DEFINER, service_role-only) validava apenas
-- negócio ativo, serviço ativo e pertencimento. A antecedência mínima era checada
-- somente no server action (lib/booking/actions.ts). Se uma chamada futura à RPC
-- bypassar a camada de aplicação, uma reserva com início no passado seria gravável
-- pelo caminho privilegiado.
--
-- Abordagem: re-assertir a invariante de antecedência dentro da função. min_notice
-- é uma duração, medida em UTC absoluto (mesma medida do server, §10.3). A janela
-- futura (booking_window_days) permanece validada no server action, conforme §11.3
-- ("a função recebe dados já validados pelo servidor"); impô-la aqui quebraria a
-- suíte de integração, que usa deliberadamente datas muito além da janela (2099)
-- para determinismo — e a janela é um limite de produto configurável (1-180 dias),
-- não uma invariante absoluta. A sobreposição reserva-vs-reserva e
-- reserva-vs-bloqueio continua coberta pelas triggers/constraints existentes.

create or replace function public.create_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_customer_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_customer public.customers;
  v_booking public.bookings;
begin
  -- 1. Business must exist and be active.
  select * into v_business
  from public.businesses
  where id = p_business_id;
  if v_business is null then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;
  if not v_business.is_active then
    raise exception 'BUSINESS_INACTIVE';
  end if;

  -- 2. Min-notice invariant (§9.5 / §10.2 / §11.3): a booking can never start in
  --    the past. Measured in absolute UTC (a duration is timezone-independent).
  if p_start_at < now() + make_interval(mins => v_business.min_notice_minutes) then
    raise exception 'BOOKING_BEFORE_MIN_NOTICE';
  end if;

  -- 3. Service must exist, belong to the same business, and be active.
  select * into v_service
  from public.services
  where id = p_service_id;
  if v_service is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;
  if v_service.business_id <> p_business_id then
    raise exception 'SERVICE_BUSINESS_MISMATCH';
  end if;
  if not v_service.is_active then
    raise exception 'SERVICE_INACTIVE';
  end if;

  -- 4. Upsert customer by (business_id, phone) on the validated service business.
  insert into public.customers (business_id, name, phone, email)
  values (v_service.business_id, p_customer_name, p_customer_phone, p_customer_email)
  on conflict (business_id, phone)
  do update set name = excluded.name, email = coalesce(excluded.email, public.customers.email)
  returning * into v_customer;

  -- 5. Insert booking. All snapshots recomputed server-side from the validated
  --    service; identity fields derive from the service, never from the caller.
  insert into public.bookings (
    business_id,
    service_id,
    customer_id,
    customer_name_snapshot,
    customer_phone_snapshot,
    customer_email_snapshot,
    service_name_snapshot,
    duration_minutes_snapshot,
    price_cents_snapshot,
    start_at,
    end_at,
    customer_note
  )
  values (
    v_service.business_id,
    v_service.id,
    v_customer.id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    v_service.name,
    v_service.duration_minutes,
    v_service.price_cents,
    p_start_at,
    p_start_at + make_interval(mins => v_service.duration_minutes),
    p_customer_note
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

-- Re-assert the strict server-only posture (idempotent).
revoke all on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, text) to service_role;
