import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, canTransition, isTerminal } from "@/lib/bookings/transitions";

describe("canTransition (§11.2)", () => {
  it("confirmed can go to completed, cancelled, no_show", () => {
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
  });

  it("confirmed cannot go to confirmed", () => {
    expect(canTransition("confirmed", "confirmed")).toBe(false);
  });

  it("terminal states cannot transition", () => {
    expect(canTransition("completed", "confirmed")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("no_show", "completed")).toBe(false);
  });
});

describe("isTerminal", () => {
  it("marks completed, cancelled and no_show as terminal", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("no_show")).toBe(true);
  });

  it("confirmed is not terminal", () => {
    expect(isTerminal("confirmed")).toBe(false);
  });
});

describe("ALLOWED_TRANSITIONS table", () => {
  it("matches the spec §11.2 transitions", () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      confirmed: ["completed", "cancelled", "no_show"],
      completed: [],
      cancelled: [],
      no_show: [],
    });
  });
});
