import { fireEvent, render, screen } from "@testing-library/react";
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
  it("filters the list by the selected date, like the day/week grids", () => {
    const onDay = booking({ id: "a", start_at: "2026-09-20T11:00:00.000Z", customer_name_snapshot: "Joana" });
    const offDay = booking({ id: "b", start_at: "2026-09-21T11:00:00.000Z", customer_name_snapshot: "Pedro" });

    render(
      <AgendaView
        bookings={[onDay, offDay]}
        availability={[]}
        timezone={TZ}
        slotIntervalMinutes={30}
      />,
    );

    // The date control must be live in the list view too.
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-09-20" } });

    expect(screen.getByText(/Joana/)).toBeInTheDocument();
    expect(screen.queryByText(/Pedro/)).not.toBeInTheDocument();
  });
});
