import { describe, expect, it } from "vitest";
import {
  PLAN_LABEL,
  canAddProfessional,
  getProfessionalLimit,
  isProPlan,
  isSelfServeUpgradeEnabled,
  type Plan,
} from "@/lib/team/plan";

describe("getProfessionalLimit (ADR 0007: Free=1, Pro=3)", () => {
  it("limits Free to 1 professional", () => {
    expect(getProfessionalLimit("free")).toBe(1);
  });

  it("limits Pro to 3 professionals", () => {
    expect(getProfessionalLimit("pro")).toBe(3);
  });
});

describe("PLAN_LABEL", () => {
  it("maps each plan to its display label", () => {
    expect(PLAN_LABEL.free).toBe("Free");
    expect(PLAN_LABEL.pro).toBe("Pro");
  });
});

describe("canAddProfessional (ADR 0007: Free=1, Pro=3)", () => {
  it("Free allows adding the very first professional", () => {
    expect(canAddProfessional(0, "free")).toBe(true);
  });

  it("Free blocks adding a second active professional", () => {
    expect(canAddProfessional(1, "free")).toBe(false);
  });

  it("Pro allows up to three active professionals", () => {
    const plan: Plan = "pro";
    expect(canAddProfessional(0, plan)).toBe(true);
    expect(canAddProfessional(1, plan)).toBe(true);
    expect(canAddProfessional(2, plan)).toBe(true);
  });

  it("Pro blocks a fourth active professional", () => {
    expect(canAddProfessional(3, "pro")).toBe(false);
  });
});

describe("isProPlan (INC-2: Pro-gated features like reports and reminders)", () => {
  it("is true only for the pro plan", () => {
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("free")).toBe(false);
  });

  it("treats a missing or null plan as not-Pro (fail-closed)", () => {
    expect(isProPlan(null)).toBe(false);
    expect(isProPlan(undefined)).toBe(false);
  });
});

describe("isSelfServeUpgradeEnabled (ADR 0007: dev/preview only)", () => {
  it("is enabled in a local dev build (NODE_ENV=development)", () => {
    expect(isSelfServeUpgradeEnabled({ nodeEnv: "development" })).toBe(true);
  });

  it("is enabled in a Vercel preview build (NODE_ENV=production, VERCEL_ENV=preview)", () => {
    expect(isSelfServeUpgradeEnabled({ nodeEnv: "production", vercelEnv: "preview" })).toBe(true);
  });

  it("is disabled in a Vercel production build (NODE_ENV=production, VERCEL_ENV=production)", () => {
    expect(isSelfServeUpgradeEnabled({ nodeEnv: "production", vercelEnv: "production" })).toBe(false);
  });

  it("is disabled in a non-Vercel production build (NODE_ENV=production, no VERCEL_ENV)", () => {
    expect(isSelfServeUpgradeEnabled({ nodeEnv: "production" })).toBe(false);
  });
});
