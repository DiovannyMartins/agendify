import { describe, expect, it } from "vitest";
import {
  describeTimezoneImpact,
  type TimezoneAffectedBooking,
} from "@/lib/business/timezone-lock";

const TZ = "America/Sao_Paulo";

function booking(overrides: Partial<TimezoneAffectedBooking>): TimezoneAffectedBooking {
  return {
    id: "bk1",
    startAt: "2026-09-10T15:00:00Z",
    serviceName: "Corte",
    customerName: "Ana",
    ...overrides,
  };
}

describe("describeTimezoneImpact (INC-4)", () => {
  it("renders each booking in the business timezone (UTC-3 -> 12:00)", () => {
    const impact = describeTimezoneImpact([booking({ startAt: "2026-09-10T15:00:00Z" })], TZ);
    expect(impact.count).toBe(1);
    expect(impact.items[0].label).toBe("Corte · Ana em 10/09/2026 às 12:00");
  });

  it("sorts the affected bookings chronologically by start time", () => {
    const impact = describeTimezoneImpact(
      [
        booking({ id: "later", startAt: "2026-09-11T15:00:00Z" }),
        booking({ id: "earlier", startAt: "2026-09-09T15:00:00Z" }),
      ],
      TZ,
    );
    expect(impact.items.map((i) => i.id)).toEqual(["earlier", "later"]);
  });

  it("reports the total count independently of sorting", () => {
    const impact = describeTimezoneImpact([booking({}), booking({ id: "bk2" })], TZ);
    expect(impact.count).toBe(2);
  });

  it("returns an empty summary when there are no affected bookings", () => {
    const impact = describeTimezoneImpact([], TZ);
    expect(impact).toEqual({ count: 0, items: [] });
  });

  it("renders a positive-offset timezone correctly (UTC+2 -> 17:00)", () => {
    const impact = describeTimezoneImpact([booking({ startAt: "2026-09-10T15:00:00Z" })], "Europe/Berlin");
    expect(impact.items[0].label).toContain("17:00");
  });
});
