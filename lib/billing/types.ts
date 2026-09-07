// Billing seam types (ADR 0008). The plan is the seat of the gate
// (`businesses.plan`, free | pro); the `subscriptions` table stores the Mercado
// Pago preapproval data. These types are provider-agnostic — the concrete
// provider (Mercado Pago) lives behind `BillingProvider` (provider.ts). The plan
// type is reused from the plan gate seam (`lib/plan/plan.ts`) so there is a
// single source of truth for `free | pro`.
import type { Plan } from "@/lib/plan/plan";

export type BillingPlan = Plan;

export type SubscriptionStatus = "pending" | "authorized" | "paused" | "cancelled";

// The current subscription as shown in the dashboard. Maps one-to-one to a row
// in `public.subscriptions`, but with snake_case keys re-mapped to camelCase so
// the UI never leaks the database column names.
export interface BillingSubscription {
  mpPreapprovalId: string;
  status: SubscriptionStatus;
  plan: BillingPlan;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}
