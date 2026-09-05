import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicLinkQR } from "@/components/public-link-qr";

describe("PublicLinkQR (INC-4 QR do link público)", () => {
  it("encodes the public URL (origin + slug) as an accessible QR (svg role img)", () => {
    render(<PublicLinkQR slug="barbearia-demo" />);
    const qr = screen.getByRole("img");
    // jsdom origin is http://localhost:3000.
    const title = qr.querySelector("title")?.textContent ?? "";
    expect(title).toBe("Endereço público: http://localhost:3000/barbearia-demo");
    expect(qr.tagName.toLowerCase()).toBe("svg");
  });
});
