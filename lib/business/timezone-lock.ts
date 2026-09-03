// Timezone-lock seam (INC-4). Changing a business's timezone is forbidden while
// it has active future bookings (ADR 0003), so the dashboard must not only block
// the change but also tell the owner *which* appointments are affected.
//
// This module is pure and DB-free: callers (lib/business/actions.ts) fetch the
// candidate bookings and pass them here; it turns them into the sorted, localized
// summary the warning UI renders. `start_at` is UTC; dates render in the
// business's IANA timezone, matching ADR 0003 and the reminder/agenda seams.

export type TimezoneAffectedBooking = {
  id: string;
  startAt: string; // ISO UTC instant
  serviceName: string;
  customerName: string;
};

export type TimezoneImpactItem = {
  id: string;
  label: string;
};

export type TimezoneImpact = {
  count: number;
  items: TimezoneImpactItem[];
};

// Deterministic rendering of an appointment in the business timezone:
// "dd/mm/yyyy às HH:mm" (same format as the reminder seam, kept local for a
// self-contained deep module — no cross-seam coupling).
function formatWhen(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).formatToParts(new Date(iso));

  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${value("day")}/${value("month")}/${value("year")} às ${value("hour")}:${value("minute")}`;
}

// Sort chronologically (earliest first) and label each affected booking so the
// owner can see, at a glance, exactly which future appointments would be broken
// by a timezone change. The count is stable regardless of sorting.
export function describeTimezoneImpact(
  bookings: TimezoneAffectedBooking[],
  timezone: string,
): TimezoneImpact {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const items = sorted.map((booking) => ({
    id: booking.id,
    label: `${booking.serviceName} · ${booking.customerName} em ${formatWhen(booking.startAt, timezone)}`,
  }));
  return { count: bookings.length, items };
}
