import { describe, expect, it, vi } from "vitest";
import { getSubscription, type FetchSubscription } from "./get-subscription";
import type { BillingSubscription } from "./types";

describe("getSubscription (ADR 0008)", () => {
  it("returns the business plan and null when there is no subscription", async () => {
    const fetchSubscription: FetchSubscription = vi.fn(async () => null);

    const result = await getSubscription({ id: "biz_1", plan: "free" }, { fetchSubscription });

    expect(result).toEqual({ plan: "free", subscription: null });
    expect(fetchSubscription).toHaveBeenCalledWith("biz_1");
  });

  it("returns the latest subscription row mapped to camelCase", async () => {
    const subscription: BillingSubscription = {
      mpPreapprovalId: "mp_42",
      status: "authorized",
      plan: "pro",
      currentPeriodStart: "2099-01-01T00:00:00.000Z",
      currentPeriodEnd: "2099-02-01T00:00:00.000Z",
    };
    const fetchSubscription: FetchSubscription = vi.fn(async () => subscription);

    const result = await getSubscription({ id: "biz_1", plan: "pro" }, { fetchSubscription });

    expect(result.plan).toBe("pro");
    expect(result.subscription).toEqual(subscription);
  });

  it("surfaces the plan regardless of the subscription state", async () => {
    const fetchSubscription: FetchSubscription = vi.fn(async () => null);

    const result = await getSubscription({ id: "biz_1", plan: "pro" }, { fetchSubscription });

    expect(result.plan).toBe("pro");
    expect(result.subscription).toBeNull();
  });
});
