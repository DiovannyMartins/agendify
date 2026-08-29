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

export function isValidSlot(date: string, start: string, now: Date, rules: BusinessRules): boolean {
  // The slot belongs to the business-local day `date` (already validated to be
  // within window). Compare its UTC instant against "now" on the same timeline,
  // using the business timezone to derive the local calendar date of now.
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = start.split(":").map(Number);
  const slotDate = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const noticeMs = rules.minNoticeMinutes * 60 * 1000;
  return slotDate.getTime() - now.getTime() >= noticeMs;
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
