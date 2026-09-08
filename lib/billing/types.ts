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

// A `cancelled`/`paused` subscription is no longer being charged and sits in the
// grace window (carência): the business keeps Pro features until the grace
// expires. Used to decide whether a Pro business may start a fresh preapproval
// (re-subscribe) and whether the re-subscribe CTA should show.
export function isSubscriptionInGrace(status: SubscriptionStatus | null | undefined): boolean {
  return status === "cancelled" || status === "paused";
}
