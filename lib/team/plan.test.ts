import { describe, expect, it } from "vitest";
import { canAddProfessional, getProfessionalLimit, type Plan } from "@/lib/team/plan";

describe("getProfessionalLimit (ADR 0007: Free=1, Pro=3)", () => {
  it("limits Free to 1 professional", () => {
    expect(getProfessionalLimit("free")).toBe(1);
  });

  it("limits Pro to 3 professionals", () => {
    expect(getProfessionalLimit("pro")).toBe(3);
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
