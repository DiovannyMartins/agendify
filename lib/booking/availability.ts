export interface SlotInterval {
  startTime: string;
  endTime: string;
}

export type TimeRange = { start: string; end: string };

export interface BusinessRules {
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  bookingWindowDays: number;
}

export interface BookingOccupancy extends TimeRange {
  id?: string;
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && a.end > b.start;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function tzOffsetMinutes(timezone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const localAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return (localAsUtc - utcMs) / 60_000;
}

export function timeToMinutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

export function generateSlotStartTimes(
  interval: SlotInterval,
  slotIntervalMinutes: number,
  durationMinutes: number,
): string[] {
  const startMinutes = timeToMinutes(interval.startTime);
  const endMinutes = timeToMinutes(interval.endTime);

  const candidates: string[] = [];
  for (let t = startMinutes; t < endMinutes; t += slotIntervalMinutes) {
    if (t + durationMinutes > endMinutes) break;
    candidates.push(minutesToTime(t));
  }
  return candidates;
}

export function toLocalDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function isWithinWindow(date: string, rules: BusinessRules, now: Date): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  const today = new Date(toLocalDate(now, rules.timezone) + "T00:00:00Z");
  const windowEnd = new Date(today);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + rules.bookingWindowDays);
  return target >= today && target <= windowEnd;
}

export function zonedTimeToUtcMs(date: string, time: string, timezone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // UTC instant whose local (in `timezone`) wall-clock reading equals date+time.
  // Iterate to converge on DST-aware offsets.
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = naive - tzOffsetMinutes(timezone, naive) * 60_000;
  guess = naive - tzOffsetMinutes(timezone, guess) * 60_000;
  guess = naive - tzOffsetMinutes(timezone, guess) * 60_000;
  return guess;
}

export function zonedTimeToUtc(date: string, time: string, timezone: string): string {
  return new Date(zonedTimeToUtcMs(date, time, timezone)).toISOString();
}

// Inclusive start / exclusive end of the business-local calendar day `date`,
// expressed as UTC instants. Used so availability/blocks/bookings are fetched
// per the business's actual day, not the UTC day.
export function localDayRangeUtc(date: string, timezone: string): { start: string; end: string } {
  const startMs = zonedTimeToUtcMs(date, "00:00", timezone);
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  const endMs = zonedTimeToUtcMs(nextDate, "00:00", timezone);
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() };
}

export function isValidSlot(date: string, start: string, now: Date, rules: BusinessRules): boolean {
  // Convert the business-local date+time to its real UTC instant, then measure
  // the notice against "now" on the same UTC timeline.
  const slotInstant = zonedTimeToUtcMs(date, start, rules.timezone);
  const noticeMs = rules.minNoticeMinutes * 60 * 1000;
  return slotInstant - now.getTime() >= noticeMs;
}

export function isOccupied(candidate: TimeRange, occupancies: BookingOccupancy[]): boolean {
  return occupancies.some((o) => overlaps(candidate, o));
}

export function computeAvailableSlots(params: {
  intervals: SlotInterval[];
  rules: BusinessRules;
  durationMinutes: number;
  date: string;
  now: Date;
  blocks: TimeRange[];
  occupancies: BookingOccupancy[];
}): string[] {
  const { intervals, rules, durationMinutes, date, now, blocks, occupancies } = params;

  if (!isWithinWindow(date, rules, now)) return [];

  const available: string[] = [];
  for (const interval of intervals) {
    const starts = generateSlotStartTimes(interval, rules.slotIntervalMinutes, durationMinutes);
    for (const start of starts) {
      const end = minutesToTime(timeToMinutes(start) + durationMinutes);
      const candidate = { start, end };
      if (blocks.some((b) => overlaps(candidate, b))) continue;
      if (isOccupied(candidate, occupancies)) continue;
      if (!isValidSlot(date, start, now, rules)) continue;
      available.push(start);
    }
  }
  return available.sort();
}
