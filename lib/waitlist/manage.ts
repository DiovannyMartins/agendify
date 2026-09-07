// Waitlist-management gate (issue #22, ADR 0008). The dashboard page that lists a
// business's waitlist entries and the actions that notify/convert them are a
// PROFESSIONAL feature, so the same `assertProPlan` seam that gates reports,
// reminders and the calendar export funnels this boundary. `buildWaitlistManagementResult`
// is the pure decision core: it checks the business plan first (fail-closed) and
// only fetches the entries for a Pro business, so a Free business can never see
// its waitlist. The entries fetch is injected so the gate is unit-testable
// without a database, and the boundary can be exercised with a real
// user-scoped client (RLS) in the integration tests. The public join stays free.
import { assertProPlan, type Plan } from "@/lib/plan/plan";
import type { WaitlistStatus } from "@/lib/waitlist/waitlist";

export type ManageWaitlistEntry = {
  id: string;
  business_id: string;
  service_id: string;
  service_name: string;
  start_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: WaitlistStatus;
  created_at: string;
};

export type WaitlistManagementBusiness = { id: string; plan?: Plan | null };

export type FetchWaitlistEntries = (businessId: string) => Promise<ManageWaitlistEntry[]>;

export type WaitlistManagementResult =
  | { status: "no_business" }
  | { status: "error" }
  | { status: "upgrade_required" }
  | { status: "ok"; entries: ManageWaitlistEntry[] };

export async function buildWaitlistManagementResult(
  business: WaitlistManagementBusiness | null,
  fetchEntries: FetchWaitlistEntries,
): Promise<WaitlistManagementResult> {
  if (!business) return { status: "no_business" };

  const gate = assertProPlan(business);
  if (!gate.ok) return { status: "upgrade_required" };

  try {
    const entries = await fetchEntries(business.id);
    return { status: "ok", entries };
  } catch {
    return { status: "error" };
  }
}
