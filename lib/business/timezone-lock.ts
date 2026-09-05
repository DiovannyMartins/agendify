// Timezone-lock seam (INC-4). Changing a business's timezone is forbidden while
// it has active future bookings (ADR 0003), so the dashboard must not only block
// the change but also tell the owner *which* appointments are affected.
//
// This module is pure and DB-free: callers (lib/business/actions.ts) fetch the
// candidate bookings and pass them here; it turns them into the sorted, localized
// summary the warning UI renders. `start_at` is UTC; dates render in the
// business's IANA timezone, matching ADR 0003 and the reminder/agenda seams.

import { formatWhen } from "@/lib/format/when";

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
