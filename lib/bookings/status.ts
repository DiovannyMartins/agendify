import type { BookingStatus } from "@/lib/bookings/transitions";

export type StatusVariant = "default" | "secondary" | "destructive" | "outline";

// §11.2 labels for each reservation status. `statusLabel` is the safe accessor:
// an unexpected (string) value falls back to the confirmed label so the UI never
// crashes on a status the app doesn't yet know.
export const STATUS_LABEL: Record<BookingStatus, { label: string; variant: StatusVariant }> = {
  confirmed: { label: "Confirmada", variant: "default" },
  completed: { label: "Concluída", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "No-show", variant: "outline" },
};

export function statusLabel(status: BookingStatus | string): { label: string; variant: StatusVariant } {
  return STATUS_LABEL[status as BookingStatus] ?? STATUS_LABEL.confirmed;
}
