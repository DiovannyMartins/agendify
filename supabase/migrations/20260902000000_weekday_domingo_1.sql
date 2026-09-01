-- Migration 0018: rotate `availability.weekday` so numbering matches the UI
-- convention 1=Domingo .. 7=Sábado.
--
-- After migration 0017 the stored values followed 1=Segunda .. 7=Domingo
-- (ISO). The product wants 1=Domingo, 2=Segunda, 3=Terça .. 7=Sábado instead.
-- Rotating every existing row preserves each row's real weekday:
--
--   old 1 (Segunda)  -> 2
--   old 2 (Terça)    -> 3
--   old 3 (Quarta)   -> 4
--   old 4 (Quinta)   -> 5
--   old 5 (Sexta)    -> 6
--   old 6 (Sábado)   -> 7
--   old 7 (Domingo)  -> 1
--
-- `(weekday % 7) + 1` maps 1->2, 2->3, ... 6->7, 7->1. Each row is computed
-- from its own old value within the single statement, so no temporary column or
-- intermediate values are needed.

update public.availability set weekday = (weekday % 7) + 1;
