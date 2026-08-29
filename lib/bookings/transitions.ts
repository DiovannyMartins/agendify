export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

// §11.2 Transitions permitted by the MVP.
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function isTerminal(status: BookingStatus): boolean {
  return status !== "confirmed";
}
