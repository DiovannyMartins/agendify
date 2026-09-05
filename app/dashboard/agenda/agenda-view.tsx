"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarRange, List, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filterAgenda,
  type AgendaBooking,
  type AvailabilityRow,
  type Professional,
} from "@/lib/agenda/view";
import type { BookingStatus } from "@/lib/bookings/transitions";
import { STATUS_LABEL } from "@/lib/bookings/status";
import { toLocalDate } from "@/lib/booking/availability";
import { AgendaList } from "./agenda-list";
import { AgendaGrid } from "./agenda-grid";

type ViewMode = "list" | "day" | "week";
type StatusFilter = BookingStatus | "";

const VIEWS: { mode: ViewMode; label: string; icon: typeof List }[] = [
  { mode: "list", label: "Lista", icon: List },
  { mode: "day", label: "Dia", icon: CalendarDays },
  { mode: "week", label: "Semana", icon: CalendarRange },
];

const STATUS_ITEMS: Record<string, string> = {
  "": "Todos os status",
  ...Object.fromEntries(Object.entries(STATUS_LABEL).map(([value, { label }]) => [value, label])),
};

function shiftDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function AgendaView({
  bookings,
  professionals,
  availability,
  timezone,
  slotIntervalMinutes,
}: {
  bookings: AgendaBooking[];
  professionals: Professional[];
  availability: AvailabilityRow[];
  timezone: string;
  slotIntervalMinutes: number;
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [dateKey, setDateKey] = useState(() => toLocalDate(new Date(), timezone));
  const [status, setStatus] = useState<StatusFilter>("");
  const [professionalId, setProfessionalId] = useState("");

  const professionalNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of professionals) map.set(p.id, p.name);
    return (id: string | null) => map.get(id ?? "") ?? "";
  }, [professionals]);

  const professionalItems = useMemo(
    () => ({ "": "Todos", ...Object.fromEntries(professionals.map((p) => [p.id, p.name])) }),
    [professionals],
  );

  // Status + professional filters apply in every view. Day/week fix the date on
  // top; the list also narrows to the selected date so the date control is live
  // in every mode.
  const filtered = useMemo(
    () =>
      filterAgenda(bookings, {
        tz: timezone,
        filters: {
          status: status || null,
          professionalId: professionalId || null,
        },
      }),
    [bookings, timezone, status, professionalId],
  );

  const listBookings = useMemo(
    () => filterAgenda(filtered, { tz: timezone, filters: { dateKey } }),
    [filtered, timezone, dateKey],
  );

  const dateStep = view === "week" ? 7 : 1;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="size-5 text-primary" /> Agenda
        </h2>
        <div className="flex items-center gap-2">
          {VIEWS.map(({ mode, label, icon: Icon }) => (
            <Button
              key={mode}
              size="sm"
              variant={view === mode ? "default" : "outline"}
              onClick={() => setView(mode)}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            aria-label="Anterior"
            onClick={() => setDateKey((d) => shiftDays(d, -dateStep))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={dateKey}
            onChange={(e) => e.target.value && setDateKey(e.target.value)}
            className="w-40"
            aria-label="Data"
          />
          <Button
            size="sm"
            variant="outline"
            aria-label="Próxima"
            onClick={() => setDateKey((d) => shiftDays(d, dateStep))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDateKey(toLocalDate(new Date(), timezone))}>
            Hoje
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={status} onValueChange={(v) => setStatus((v ?? "") as StatusFilter)} items={STATUS_ITEMS}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={professionalId}
            onValueChange={(v) => setProfessionalId(v ?? "")}
            items={professionalItems}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
        {view === "list" ? (
          <AgendaList bookings={listBookings} timezone={timezone} professionalNames={professionalNames} />
        ) : (
          <AgendaGrid
            view={view}
            dateKey={dateKey}
            timezone={timezone}
            slotIntervalMinutes={slotIntervalMinutes}
            professionals={professionals}
            availability={availability}
            filtered={filtered}
          />
        )}
      </div>
    </div>
  );
}
