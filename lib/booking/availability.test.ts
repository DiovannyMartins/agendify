import { describe, expect, it } from "vitest";
import { generateSlotStartTimes, overlaps } from "@/lib/booking/availability";

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
    const starts = generateSlotStartTimes(
      { startTime: "09:00", endTime: "10:00" },
      30,
      45,
    );
    expect(starts).toEqual(["09:00"]);
  });
});
