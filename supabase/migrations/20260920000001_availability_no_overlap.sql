-- Migration 0041: impedir sobreposição de faixas de disponibilidade no banco (§9.3).
--
-- Causa raiz: a checagem anti-sobreposição de availability vivia apenas no server
-- action setAvailability (lib/availability/actions.ts:45-53), num read-then-insert
-- sujeito a TOCTOU. A única constraint era UNIQUE (business_id, weekday,
-- start_time) — que impede start_time duplicado, mas NÃO impede duas faixas com
-- start_time distintos e intervalos sobrepostos (ex.: 08:00-10:00 e 09:00-11:00)
-- sob concorrência.
--
-- Abordagem: constraint de exclusão no banco, preferida a lock de aplicação (regra
-- de trabalho). Como availability usa `time` (relógio local do negócio, sem data) e
-- o PostgreSQL não tem um range type nativo de `time`, criamos um `timerange` em
-- `public` e usamos `EXCLUDE USING gist` com o mesmo semântico de intervalo
-- semiaberto `[)` de §10.3 (um atendimento termina às 10:00 e o próximo começa
-- às 10:00 sem conflito). A constraint é parcial (`where is_active`) para espelhar
-- o que a aplicação considera (apenas faixas ativas). Preflight rejeita a migration
-- se já existirem faixas ativas sobrepostas, exigindo reconciliação prévia.

-- 1. Custom `time` range type (guarded; construtor `timerange(...)` é gerado).
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'timerange' and n.nspname = 'public'
  ) then
    create type public.timerange as range (subtype = time);
  end if;
end $$;

-- 2. Preflight: fail early (and clearly) if existing active faixas overlap.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.availability a
  join public.availability b
    on b.business_id = a.business_id
   and b.weekday = a.weekday
   and b.is_active
   and a.is_active
   and a.id <> b.id
   and timerange(a.start_time, a.end_time, '[)') && timerange(b.start_time, b.end_time, '[)');
  if v_count > 0 then
    raise exception 'EXISTING_AVAILABILITY_OVERLAP: % overlapping active faixas must be reconciled before this constraint can be added', v_count;
  end if;
end $$;

-- 3. Exclusion constraint: same business + weekday + overlapping (active) faixas
--    are rejected at the database layer, regardless of the caller.
alter table public.availability
  add constraint availability_no_overlap
  exclude using gist (
    business_id with =,
    weekday with =,
    timerange(start_time, end_time, '[)') with &&
  )
  where (is_active);
