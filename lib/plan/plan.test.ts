import { describe, expect, it } from "vitest";
import { assertProPlan, isProPlan, type Plan } from "@/lib/plan/plan";

describe("assertProPlan (ADR 0008)", () => {
  it("returns ok for a pro business", () => {
    expect(assertProPlan({ plan: "pro" })).toEqual({ ok: true });
  });

  it("returns UPGRADE_REQUIRED for a free business", () => {
    expect(assertProPlan({ plan: "free" })).toEqual({ ok: false, code: "UPGRADE_REQUIRED" });
  });

  it("fails closed for a missing or null plan", () => {
    expect(assertProPlan({ plan: null })).toEqual({ ok: false, code: "UPGRADE_REQUIRED" });
    expect(assertProPlan({})).toEqual({ ok: false, code: "UPGRADE_REQUIRED" });
  });

  it("accepts a business row with a non-null plan", () => {
    const business: { plan: Plan } = { plan: "pro" };
    expect(assertProPlan(business)).toEqual({ ok: true });
  });
});

describe("isProPlan", () => {
  it("is true only for the pro plan", () => {
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("free")).toBe(false);
    expect(isProPlan(null)).toBe(false);
    expect(isProPlan(undefined)).toBe(false);
  });
});
