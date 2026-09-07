import type { WaitlistStatus } from "@/lib/waitlist/waitlist";

export type StatusVariant = "default" | "secondary" | "destructive" | "outline";

// Labels for each waitlist entry status (issue #22). `waitlistStatusLabel` is the
// safe accessor: an unexpected (string) value falls back to the pending label so
// the UI never crashes on a status the app doesn't yet know.
export const WAITLIST_STATUS_LABEL: Record<WaitlistStatus, { label: string; variant: StatusVariant }> = {
  pending: { label: "Aguardando", variant: "secondary" },
  notified: { label: "Notificado", variant: "default" },
  converted: { label: "Convertido", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export function waitlistStatusLabel(
  status: WaitlistStatus | string,
): { label: string; variant: StatusVariant } {
  return WAITLIST_STATUS_LABEL[status as WaitlistStatus] ?? WAITLIST_STATUS_LABEL.pending;
}
