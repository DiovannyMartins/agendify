export interface SlotInterval {
  startTime: string;
  endTime: string;
}

export type TimeRange = { start: string; end: string };

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && a.end > b.start;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function generateSlotStartTimes(
  interval: { startTime: string; endTime: string },
  slotIntervalMinutes: number,
  durationMinutes: number,
): string[] {
  const startMinutes =
    Number(interval.startTime.slice(0, 2)) * 60 + Number(interval.startTime.slice(3, 5));
  const endMinutes =
    Number(interval.endTime.slice(0, 2)) * 60 + Number(interval.endTime.slice(3, 5));

  const candidates: string[] = [];
  for (let t = startMinutes; t < endMinutes; t += slotIntervalMinutes) {
    if (t + durationMinutes > endMinutes) break;
    candidates.push(minutesToTime(t));
  }
  return candidates;
}
