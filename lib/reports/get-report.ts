// Server-side retrieval of the Pro billing report (INC-2). It resolves the
// selected period, enforces the plan gate (ADR 0007: Pro-only) and computes the
// report from the owner's own bookings (RLS scopes them). The math is the pure
// module; this file is only the boundary that fetches and gates.
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/queries";
import { isProPlan } from "@/lib/team/plan";
import {
  buildBillingReport,
  resolveRange,
  type BillingReport,
  type DateRange,
  type RangeKey,
  type ReportBooking,
} from "@/lib/reports/reports";

export type BillingReportResult =
  | { status: "no_business" }
  | { status: "pro_gate" }
  | { status: "error" }
  | { status: "ok"; key: RangeKey; range: DateRange; report: BillingReport };

export async function getBillingReport(rangeKey?: string): Promise<BillingReportResult> {
  const business = await getCurrentBusiness();
  if (!business) return { status: "no_business" };

  // Pro gate (ADR 0007): the report is a Pro capability. The plan is not
  // writable by the owner (see the plan-protection migration), so this server
  // check is the source of truth for what the dashboard exposes.
  if (!isProPlan(business.plan)) return { status: "pro_gate" };

  const { key, range } = resolveRange(rangeKey);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, start_at, price_cents_snapshot, service_name_snapshot")
    .eq("business_id", business.id)
    .gte("start_at", range.from)
    .lt("start_at", range.to);

  if (error) return { status: "error" };

  const bookings = (data ?? []) as unknown as ReportBooking[];
  return { status: "ok", key, range, report: buildBillingReport(bookings, range) };
}
