import { describe, expect, it } from "vitest";
import {
  computeAvailableSlots,
  generateSlotStartTimes,
  isWithinWindow,
  overlaps,
} from "@/lib/booking/availability";
import type { BusinessRules } from "@/lib/booking/availability";

describe("overlaps", () => {
  it("detects overlapping half-open intervals", () => {
    expect(overlaps({ start: "09:00", end: "09:45" }, { start: "08:30", end: "09:15" })).toBe(true);
  });

  it("allows back-to-back appointments", () => {
    expect(overlaps({ start: "09:00", end: "10:00" }, { start: "10:00", end: "11:00" })).toBe(false);
  });
});

describe("generateSlotStartTimes (spec §10.4 example)", () => {
  it("produces candidates capped by service duration within the interval", () => {
    const starts = generateSlotStartTimes(
      { startTime: "08:00", endTime: "12:00" },
      30,
      45,
    );
    expect(starts).toEqual(["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("never produces a candidate that ends past the interval end", () => {
    const starts = generateSlotStartTimes({ startTime: "09:00", endTime: "10:00" }, 30, 45);
    expect(starts).toEqual(["09:00"]);
  });
});

describe("isWithinWindow", () => {
  const rules: BusinessRules = {
    timezone: "America/Sao_Paulo",
    slotIntervalMinutes: 30,
    minNoticeMinutes: 120,
    bookingWindowDays: 60,
  };

  it("accepts a date inside the window", () => {
    const now = new Date("2026-09-01T12:00:00Z");
    expect(isWithinWindow("2026-09-10", rules, now)).toBe(true);
  });

  it("rejects a date too far in the future", () => {
    const now = new Date("2026-09-01T12:00:00Z");
    expect(isWithinWindow("2026-12-01", rules, now)).toBe(false);
  });

  it("rejects a past date", () => {
    const now = new Date("2026-09-01T12:00:00Z");
    expect(isWithinWindow("2026-08-01", rules, now)).toBe(false);
  });
});

describe("computeAvailableSlots", () => {
  const rules: BusinessRules = {
    timezone: "America/Sao_Paulo",
    slotIntervalMinutes: 30,
    minNoticeMinutes: 0,
    bookingWindowDays: 60,
  };

  it("excludes a slot overlapping an existing booking", () => {
    const slots = computeAvailableSlots({
      intervals: [{ startTime: "08:00", endTime: "12:00" }],
      rules,
      durationMinutes: 45,
      date: "2026-09-10",
      now: new Date("2026-09-10T00:00:00Z"),
      blocks: [],
      occupancies: [{ start: "09:00", end: "09:45" }],
    });
    expect(slots).toContain("08:00");
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:30");
    expect(slots).toContain("10:00");
  });

  it("excludes slots within a block", () => {
    const slots = computeAvailableSlots({
      intervals: [{ startTime: "08:00", endTime: "12:00" }],
      rules,
      durationMinutes: 30,
      date: "2026-09-10",
      now: new Date("2026-09-10T00:00:00Z"),
      blocks: [{ start: "10:00", end: "11:00" }],
      occupancies: [],
    });
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("08:00");
  });

  it("returns an empty list when no intervals exist for the day", () => {
    const slots = computeAvailableSlots({
      intervals: [],
      rules,
      durationMinutes: 30,
      date: "2026-09-10",
      now: new Date("2026-09-10T00:00:00Z"),
      blocks: [],
      occupancies: [],
    });
    expect(slots).toEqual([]);
  });
});
