"use client";

import { CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimezoneImpact } from "@/lib/business/timezone-lock";

// Clear warning shown when a timezone change is blocked by active future
// bookings (INC-4). Besides the block, it lists the affected reservations so the
// owner knows exactly what to cancel or reschedule.
export function TimezoneLockWarning({
  impact,
  className,
}: {
  impact: TimezoneImpact;
  className?: string;
}) {
  const count = impact.count;
  return (
    <div
      role="alert"
      className={cn("rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900", className)}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarX className="size-4" />
        Fuso horário bloqueado — {count} {count === 1 ? "reserva futura" : "reservas futuras"} afetada{count === 1 ? "" : "s"}
      </div>
      <p className="mt-1 text-sm">
        A mudança de fuso horário não foi aplicada. Estas reservas seriam afetadas:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {impact.items.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
}
