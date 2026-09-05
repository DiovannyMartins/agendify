// Server-side retrieval of the billing report (INC-2). It resolves the selected
// period and computes the report from the owner's own bookings (RLS scopes
// them). The math is the pure module; this file is only the boundary that
// fetches.
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/queries";
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
  | { status: "error" }
  | { status: "ok"; key: RangeKey; range: DateRange; report: BillingReport };

export async function getBillingReport(rangeKey?: string): Promise<BillingReportResult> {
  const business = await getCurrentBusiness();
  if (!business) return { status: "no_business" };

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
