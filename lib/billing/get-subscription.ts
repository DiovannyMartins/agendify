// Server-side retrieval of the business's current subscription (ADR 0008). It
// resolves the latest `subscriptions` row for a business (RLS scopes it to the
// owner) and returns it alongside the plan that is the seat of the gate. The
// fetch is injectable so the boundary can be exercised against a real
// user-scoped client in the integration tests.
import { createClient } from "@/lib/supabase/server";
import type { BillingPlan, BillingSubscription, SubscriptionStatus } from "./types";

export type FetchSubscription = (businessId: string) => Promise<BillingSubscription | null>;

export interface GetSubscriptionResult {
  plan: BillingPlan;
  subscription: BillingSubscription | null;
}

// Maps a `subscriptions` DB row to the provider-agnostic shape. A subscription
// row always represents the paid (Pro) plan, so `plan` is taken from the row
// rather than guessed.
function mapRow(row: {
  mp_preapproval_id: string;
  status: SubscriptionStatus;
  plan: BillingPlan;
  current_period_start: string | null;
  current_period_end: string | null;
}): BillingSubscription {
  return {
    mpPreapprovalId: row.mp_preapproval_id,
    status: row.status,
    plan: row.plan,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
  };
}

// Default fetch: the owner's own rows, scoped by RLS. A business can hold more
// than one subscription row over time (re-subscription); the most recently
// created one is the current. Shared by the dashboard read and by the upgrade
// action's pending-guard.
export const fetchCurrentSubscription: FetchSubscription = async (businessId) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
};

export async function getSubscription(
  business: { id: string; plan: BillingPlan },
  deps?: { fetchSubscription?: FetchSubscription },
): Promise<GetSubscriptionResult> {
  const fetchSubscription = deps?.fetchSubscription ?? fetchCurrentSubscription;
  const subscription = await fetchSubscription(business.id);
  return { plan: business.plan, subscription };
}
