import { describe, expect, it, vi } from "vitest";
import {
  buildWaitlistManagementResult,
  type FetchWaitlistEntries,
  type ManageWaitlistEntry,
  type WaitlistManagementBusiness,
} from "@/lib/waitlist/manage";

const entry: ManageWaitlistEntry = {
  id: "w1",
  business_id: "biz-pro",
  service_id: "svc-1",
  service_name: "Corte",
  start_at: "2099-01-05T14:00:00.000Z",
  customer_name: "Maria",
  customer_phone: "+5511988888888",
  customer_email: "a@b.com",
  status: "pending",
  created_at: "2099-01-01T10:00:00.000Z",
};

const proBusiness: WaitlistManagementBusiness = { id: "biz-pro", plan: "pro" };
const freeBusiness: WaitlistManagementBusiness = { id: "biz-free", plan: "free" };
const nullPlanBusiness: WaitlistManagementBusiness = { id: "biz-null", plan: null };

describe("buildWaitlistManagementResult (Pro gate, ADR 0008 / issue #22)", () => {
  it("returns no_business when there is no business", async () => {
    const result = await buildWaitlistManagementResult(null, async () => []);
    expect(result).toEqual({ status: "no_business" });
  });

  it("returns upgrade_required for a free business without fetching entries", async () => {
    const spy = vi.fn<FetchWaitlistEntries>(async () => []);
    const result = await buildWaitlistManagementResult(freeBusiness, spy);
    expect(result).toEqual({ status: "upgrade_required" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("fails closed for a business with a null plan", async () => {
    const result = await buildWaitlistManagementResult(nullPlanBusiness, async () => []);
    expect(result).toEqual({ status: "upgrade_required" });
  });

  it("returns ok with the entries for a pro business", async () => {
    const result = await buildWaitlistManagementResult(proBusiness, async () => [entry]);
    expect(result).toEqual({ status: "ok", entries: [entry] });
  });

  it("returns error when the entries fetch throws", async () => {
    const failing: FetchWaitlistEntries = async () => {
      throw new Error("boom");
    };
    const result = await buildWaitlistManagementResult(proBusiness, failing);
    expect(result).toEqual({ status: "error" });
  });
});
