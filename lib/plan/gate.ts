// Shared Pro-gate orchestration (ADR 0008). Every gated boundary (reports,
// waitlist management, calendar export) funnels through `runProGated`, so the
// fail-closed gate decision and the `{ id, plan? }` business shape live in one
// place instead of being re-implemented per module. The fetch is injected so the
// gate is unit-testable without a database; the caller maps the `data` into its
// own success payload.
import { assertProPlan, type Plan } from "./plan";

export type GatedBusiness = { id: string; plan?: Plan | null };

export type GatedStatus = "no_business" | "error" | "upgrade_required";

export type GatedResult<T> = { status: "ok"; data: T } | { status: GatedStatus };

export async function runProGated<T>(
  business: GatedBusiness | null,
  fetch: (businessId: string) => Promise<T>,
): Promise<GatedResult<T>> {
  if (!business) return { status: "no_business" };

  const gate = assertProPlan(business);
  if (!gate.ok) return { status: "upgrade_required" };

  try {
    const data = await fetch(business.id);
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}
