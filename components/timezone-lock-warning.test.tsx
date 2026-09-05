import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimezoneLockWarning } from "@/components/timezone-lock-warning";

const twoItems = {
  count: 2,
  items: [
    { id: "bk1", label: "Corte · Ana em 10/09/2026 às 12:00" },
    { id: "bk2", label: "Barba · Bruno em 11/09/2026 às 15:00" },
  ],
};

describe("TimezoneLockWarning (INC-4 aviso de fuso)", () => {
  it("renders an alert listing every affected reservation", () => {
    render(<TimezoneLockWarning impact={twoItems} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/2 reservas futuras afetadas/)).toBeInTheDocument();
    expect(screen.getByText(/A mudança de fuso horário não foi aplicada/)).toBeInTheDocument();
    expect(screen.getByText("Corte · Ana em 10/09/2026 às 12:00")).toBeInTheDocument();
    expect(screen.getByText("Barba · Bruno em 11/09/2026 às 15:00")).toBeInTheDocument();
  });

  it("uses the singular form for a single reservation", () => {
    render(
      <TimezoneLockWarning
        impact={{ count: 1, items: [{ id: "bk1", label: "Corte · Ana em 10/09/2026 às 12:00" }] }}
      />,
    );
    expect(screen.getByText(/1 reserva futura afetada/)).toBeInTheDocument();
  });
});
