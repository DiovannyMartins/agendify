-- Migration 0042: alinhar o CHECK de duration_minutes à spec §14 (5-480 minutos).
--
-- Causa raiz: a spec exige duração entre 5 e 480 minutos, mas a constraint em
-- supabase/migrations/0003_catalog_and_bookings.sql:9 só garante `> 0`. A aplicação
-- valida 5-480 via Zod, porém o banco aceitaria um serviço de 1-4 minutos se o
-- servidor fosse bypassado.
--
-- Abordagem: trocar a constraint por um CHECK nomeado `between 5 and 480`, com
-- preflight que sinaliza claramente se algum registro existente violar (a adição de
-- um CHECK valida as linhas existentes; o preflight dá uma mensagem acionável em vez
-- de um erro cru do PostgreSQL). As linhas de seed usam 30 e 15 minutos, então não
-- há impacto em dev/preview.

do $$
declare
  v_name text;
  v_violating integer;
begin
  -- Locate and drop the existing (auto-named) CHECK on duration_minutes.
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.services'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%duration_minutes%';
  if v_name is not null then
    execute format('alter table public.services drop constraint %I', v_name);
  end if;

  -- Preflight: fail early if existing rows would violate the new range.
  select count(*) into v_violating
  from public.services
  where duration_minutes < 5 or duration_minutes > 480;
  if v_violating > 0 then
    raise exception 'INVALID_SERVICE_DURATION: % services have duration outside 5-480', v_violating;
  end if;

  execute 'alter table public.services
    add constraint services_duration_minutes_check
    check (duration_minutes between 5 and 480)';
end $$;
