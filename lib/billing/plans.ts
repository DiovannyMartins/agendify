// Plan metadata for the dashboard "Plano" section (ADR 0008). Re-exports the
// canonical catalog (`lib/plan/catalog.ts`), which is also the source the
// landing page uses, so the descriptions and privilege lists never drift.
export { PLAN_INFO, type PlanInfo } from "@/lib/plan/catalog";
