import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgendaView } from "./agenda-view";
import type { AgendaBooking } from "@/lib/agenda/view";

vi.mock("./status-action", () => ({
  StatusAction: () => null,
}));

const TZ = "America/Sao_Paulo";

function booking(over: Partial<AgendaBooking> & { id: string }): AgendaBooking {
  const startAt = over.start_at ?? "2026-09-20T11:00:00.000Z";
  return {
    id: over.id,
    start_at: startAt,
    end_at: over.end_at ?? "2026-09-20T11:30:00.000Z",
    status: over.status ?? "confirmed",
    service_name_snapshot: over.service_name_snapshot ?? "Corte",
    duration_minutes_snapshot: over.duration_minutes_snapshot ?? 30,
    customer_name_snapshot: over.customer_name_snapshot ?? "Maria",
    customer_phone_snapshot: over.customer_phone_snapshot ?? "+5511900000000",
    public_code: over.public_code ?? "ABCDEFGH",
    cancel_reason: over.cancel_reason ?? null,
  };
}

describe("AgendaView list view", () => {
  it("shows all reservations regardless of the selected date", () => {
    // A booking far in the future: the default date filter (today) must not hide it.
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const bookings = [booking({ id: "a", start_at: future, customer_name_snapshot: "Joana" })];

    render(
      <AgendaView
        bookings={bookings}
        availability={[]}
        timezone={TZ}
        slotIntervalMinutes={30}
      />,
    );

    expect(screen.getByText(/Joana/)).toBeInTheDocument();
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma reserva ainda")).not.toBeInTheDocument();
  });
});
