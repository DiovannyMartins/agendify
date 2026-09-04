// Shared appointment rendering: "dd/mm/yyyy às HH:mm" in the business timezone.
// ADR 0003 stores `start_at` in UTC; this renders the local wall-clock reading in
// the business's IANA timezone. Consumed by the timezone-lock warning, the
// reminder seam (but NOT the Deno edge function, which is a documented mirror
// that cannot import `lib/`).
export function formatWhen(iso: string, timezone: string): string {
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
