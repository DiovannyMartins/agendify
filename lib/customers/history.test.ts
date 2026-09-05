import { describe, expect, it } from "vitest";
import {
  buildCustomerHistory,
  filterCustomers,
  type CustomerRow,
} from "@/lib/customers/history";

const eli: CustomerRow = { id: "c1", name: "Eli", phone: "+5511900000001", email: "eli@ex.com" };
const ana: CustomerRow = { id: "c2", name: "Ana", phone: "+5511900000002", email: null };

describe("buildCustomerHistory", () => {
  it("groups each customer's bookings and sorts them newest-first", () => {
    const bookings = [
      { id: "b1", customer_id: "c1", start_at: "2026-09-01T10:00:00Z", status: "completed" as const, service_name_snapshot: "Corte", duration_minutes_snapshot: 30 },
      { id: "b2", customer_id: "c1", start_at: "2026-09-05T10:00:00Z", status: "confirmed" as const, service_name_snapshot: "Barba", duration_minutes_snapshot: 15 },
      { id: "b3", customer_id: "c2", start_at: "2026-08-20T10:00:00Z", status: "cancelled" as const, service_name_snapshot: "Sobrancelha", duration_minutes_snapshot: 20 },
    ];

    const history = buildCustomerHistory([eli, ana], bookings);
    expect(history).toHaveLength(2);

    const eliEntry = history.find((h) => h.customer.id === "c1")!;
    expect(eliEntry.bookings.map((b) => b.id)).toEqual(["b2", "b1"]);

    const anaEntry = history.find((h) => h.customer.id === "c2")!;
    expect(anaEntry.bookings.map((b) => b.id)).toEqual(["b3"]);
  });

  it("a customer with no bookings still appears, with an empty history", () => {
    const history = buildCustomerHistory([eli], []);
    expect(history).toEqual([{ customer: eli, bookings: [] }]);
  });
});

describe("filterCustomers", () => {
  it("matches by name, phone or email, case-insensitively", () => {
    expect(filterCustomers([eli, ana], "eli").map((c) => c.id)).toEqual(["c1"]);
    expect(filterCustomers([eli, ana], "0000001").map((c) => c.id)).toEqual(["c1"]);
    expect(filterCustomers([eli, ana], "EX.COM").map((c) => c.id)).toEqual(["c1"]);
    expect(filterCustomers([eli, ana], "ana").map((c) => c.id)).toEqual(["c2"]);
  });

  it("an empty query returns every customer", () => {
    expect(filterCustomers([eli, ana], "")).toEqual([eli, ana]);
    expect(filterCustomers([eli, ana], "   ")).toEqual([eli, ana]);
  });

  it("no match returns an empty list", () => {
    expect(filterCustomers([eli, ana], "zed")).toEqual([]);
  });
});
