import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoWebhookSignature } from "./webhook-signature";

const SECRET = "the-webhook-secret";

// Independent reference implementation, so the test never shares a bug with the
// code under test. Builds the same manifest Mercado Pago signs:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// omitting `id:`/`request-id:` pairs when the value is absent, and lowercasing a
// non-numeric data.id (Mercado Pago's manifest rule).
function sign(input: {
  dataId?: string;
  xRequestId?: string;
  ts: string;
  secret?: string;
}): string {
  const parts: string[] = [];
  if (input.dataId) parts.push(`id:${input.dataId.toLowerCase()};`);
  if (input.xRequestId) parts.push(`request-id:${input.xRequestId};`);
  parts.push(`ts:${input.ts};`);
  const manifest = parts.join("");
  return createHmac("sha256", input.secret ?? SECRET).update(manifest).digest("hex");
}

describe("verifyMercadoPagoWebhookSignature (issue #24)", () => {
  it("accepts a legitimate notification", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const dataId = "999999999";
    const xRequestId = "4ed4fa2b-0b31-42ec-a62f-ad793c486c59";
    const v1 = sign({ dataId, xRequestId, ts });

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId,
      dataId,
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it("rejects a notification with a tampered signature", () => {
    const ts = Math.floor(Date.now() / 1000).toString();

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${"0".repeat(64)}`,
      xRequestId: "req",
      dataId: "123",
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rejects when the x-signature header is missing", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: null,
      xRequestId: "req",
      dataId: "123",
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rejects when the signature has no ts or v1", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: "garbage",
      xRequestId: "req",
      dataId: "123",
      secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rejects a stale notification outside the tolerance window", () => {
    const staleTs = (Math.floor(Date.now() / 1000) - 3600).toString();
    const v1 = sign({ dataId: "123", xRequestId: "req", ts: staleTs });

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${staleTs},v1=${v1}`,
      xRequestId: "req",
      dataId: "123",
      secret: SECRET,
      maxAgeSeconds: 300,
    });
    expect(ok).toBe(false);
  });

  it("lowercases an alphanumeric data.id when building the manifest", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    // Signed against the lowercased id, as Mercado Pago does.
    const v1 = sign({ dataId: "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3", xRequestId: "req", ts });

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: "req",
      dataId: "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3",
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it("omits id/request-id from the manifest when they are absent", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const v1 = sign({ ts });

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: null,
      dataId: null,
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it("fails closed when no secret is configured", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const v1 = sign({ dataId: "123", ts });

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: "req",
      dataId: "123",
      secret: "",
    });
    expect(ok).toBe(false);
  });

  it("accepts a timestamp in milliseconds as well as seconds", () => {
    const tsMs = Math.floor(Date.now()).toString();
    const v1 = sign({ dataId: "123", xRequestId: "req", ts: tsMs });

    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: `ts=${tsMs},v1=${v1}`,
      xRequestId: "req",
      dataId: "123",
      secret: SECRET,
    });
    expect(ok).toBe(true);
  });
});
