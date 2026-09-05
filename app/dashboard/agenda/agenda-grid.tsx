"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  bookingLocalTime,
  businessWeekday,
  dayGridTimes,
  filterAgenda,
  weekDateKeys,
  type AgendaBooking,
  type AvailabilityRow,
  type Professional,
} from "@/lib/agenda/view";
import { statusLabel } from "@/lib/bookings/status";

function dayHeading(dateKey: string, timezone: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function rangeFrom(rows: AvailabilityRow[]): { start: string; end: string } | null {
  if (rows.length === 0) return null;
  const start = rows.reduce((min, a) => (a.start_time < min ? a.start_time : min), rows[0].start_time);
  const end = rows.reduce((max, a) => (a.end_time > max ? a.end_time : max), rows[0].end_time);
  return { start, end };
}

export function AgendaGrid({
  view,
  dateKey,
  timezone,
  slotIntervalMinutes,
  professionals,
  availability,
  filtered,
}: {
  view: "day" | "week";
  dateKey: string;
  timezone: string;
  slotIntervalMinutes: number;
  professionals: Professional[];
  availability: AvailabilityRow[];
  filtered: AgendaBooking[];
}) {
  if (view === "week") {
    return (
      <WeekGrid
        dateKey={dateKey}
        timezone={timezone}
        slotIntervalMinutes={slotIntervalMinutes}
        availability={availability}
        filtered={filtered}
      />
    );
  }
  return (
    <DayGrid
      dateKey={dateKey}
      timezone={timezone}
      slotIntervalMinutes={slotIntervalMinutes}
      professionals={professionals}
      availability={availability}
      filtered={filtered}
    />
  );
}

function EmptyGridDay() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        Nenhuma disponibilidade configurada para este dia.
      </CardContent>
    </Card>
  );
}

function DayGrid({
  dateKey,
  timezone,
  slotIntervalMinutes,
  professionals,
  availability,
  filtered,
}: {
  dateKey: string;
  timezone: string;
  slotIntervalMinutes: number;
  professionals: Professional[];
  availability: AvailabilityRow[];
  filtered: AgendaBooking[];
}) {
  const weekday = businessWeekday(dateKey);
  const dayAvailability = availability.filter((a) => a.weekday === weekday);
  const range = rangeFrom(dayAvailability);

  const dayBookings = useMemo(
    () => filterAgenda(filtered, { tz: timezone, filters: { dateKey } }),
    [filtered, timezone, dateKey],
  );

  const byCell = useMemo(() => {
    const map = new Map<string, AgendaBooking>();
    for (const booking of dayBookings) {
      map.set(`${booking.professional_id ?? ""}|${bookingLocalTime(booking.start_at, timezone)}`, booking);
    }
    return map;
  }, [dayBookings, timezone]);

  if (!range) return <EmptyGridDay />;
  const times = dayGridTimes(range.start, range.end, slotIntervalMinutes);

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/40">
            <th className="sticky left-0 bg-muted/40 px-3 py-2 text-left font-medium text-muted-foreground">
              Hora
            </th>
            {professionals.map((p) => (
              <th key={p.id} className="px-3 py-2 text-left font-medium">
                {p.name}
                {!p.is_active && (
                  <Badge variant="secondary" className="ml-2 align-middle">
                    Inativo
                  </Badge>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => (
            <tr key={time} className="border-t border-border">
              <td className="sticky left-0 bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
                {time}
              </td>
              {professionals.map((p) => {
                const booking = byCell.get(`${p.id}|${time}`);
                return (
                  <td key={`${time}-${p.id}`} className="px-2 py-1.5 align-top">
                    {booking && <BookingCell booking={booking} timezone={timezone} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingCell({ booking, timezone }: { booking: AgendaBooking; timezone: string }) {
  const status = statusLabel(booking.status);
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs">
      <p className="font-medium">{booking.service_name_snapshot}</p>
      <p className="text-muted-foreground">{booking.customer_name_snapshot}</p>
      <p className="mt-0.5 text-muted-foreground">
        {bookingLocalTime(booking.start_at, timezone)} · {booking.duration_minutes_snapshot} min
      </p>
      <Badge variant={status.variant} className="mt-1">
        {status.label}
      </Badge>
    </div>
  );
}

function WeekGrid({
  dateKey,
  timezone,
  slotIntervalMinutes,
  availability,
  filtered,
}: {
  dateKey: string;
  timezone: string;
  slotIntervalMinutes: number;
  availability: AvailabilityRow[];
  filtered: AgendaBooking[];
}) {
  const dates = weekDateKeys(dateKey);
  const range = rangeFrom(availability);
  const totalForWeek = useMemo(
    () =>
      dates.reduce(
        (acc, d) =>
          acc + filterAgenda(filtered, { tz: timezone, filters: { dateKey: d } }).length,
        0,
      ),
    [dates, filtered, timezone],
  );

  if (totalForWeek === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma reserva nesta semana.
        </CardContent>
      </Card>
    );
  }
  if (!range) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma disponibilidade configurada nesta semana.
        </CardContent>
      </Card>
    );
  }

  const times = dayGridTimes(range.start, range.end, slotIntervalMinutes);

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/40">
            <th className="sticky left-0 bg-muted/40 px-3 py-2 text-left font-medium text-muted-foreground">
              Hora
            </th>
            {dates.map((d) => (
              <th key={d} className="px-2 py-2 text-left font-medium capitalize">
                <span>{d === dateKey ? "Hoje" : dayHeading(d, timezone)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => (
            <tr key={time} className="border-t border-border">
              <td className="sticky left-0 bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
                {time}
              </td>
              {dates.map((d) => (
                <WeekCell key={`${d}-${time}`} dateKey={d} time={time} timezone={timezone} filtered={filtered} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekCell({
  dateKey,
  time,
  timezone,
  filtered,
}: {
  dateKey: string;
  time: string;
  timezone: string;
  filtered: AgendaBooking[];
}) {
  const bookings = useMemo(
    () =>
      filterAgenda(filtered, { tz: timezone, filters: { dateKey } }).filter(
        (b) => bookingLocalTime(b.start_at, timezone) === time,
      ),
    [filtered, timezone, dateKey, time],
  );

  if (bookings.length === 0) return <td className="px-2 py-1.5" />;
  return (
    <td className="px-2 py-1.5 align-top">
      <div className="space-y-1">
        {bookings.map((b) => (
          <WeekBooking key={b.id} booking={b} />
        ))}
      </div>
    </td>
  );
}

function WeekBooking({ booking }: { booking: AgendaBooking }) {
  const status = statusLabel(booking.status);
  return (
    <div className="rounded border border-primary/20 bg-primary/5 px-1.5 py-1 text-xs">
      <p className="font-medium">{booking.service_name_snapshot}</p>
      <p className="text-muted-foreground">{booking.customer_name_snapshot}</p>
      <Badge variant={status.variant}>{status.label}</Badge>
    </div>
  );
}
