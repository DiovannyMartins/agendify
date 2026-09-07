// Mercado Pago webhook signature verification (issue #24). Mercado Pago signs
// every webhook notification with an HMAC-SHA256 over the manifest
// `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (the `id:`/`request-id:`
// pairs are omitted when the value is absent, and an alphanumeric `data.id` is
// lowercased). The result is sent in the `x-signature` header as
// `ts=<ts>,v1=<hex>`. This is a pure function so it is unit-testable without a
// network or the provider. `verify` is constant-time (timingSafeEqual) and
// enforces a tolerance window on the timestamp so a replayed/stale notification
// is rejected.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookSignatureInput {
  xSignature: string | null | undefined;
  xRequestId: string | null | undefined;
  // The `data.id` query param that Mercado Pago appends to the notification URL.
  dataId: string | null | undefined;
  // The webhook secret from the Mercado Pago dashboard (Your integrations).
  secret: string;
  // Max age of the notification timestamp in seconds (0 disables the check).
  maxAgeSeconds?: number;
}

export function verifyMercadoPagoWebhookSignature(input: WebhookSignatureInput): boolean {
  const { xSignature, xRequestId, dataId, secret, maxAgeSeconds = 600 } = input;
  if (!secret || !xSignature) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  if (maxAgeSeconds > 0) {
    const tsNum = Number(ts);
    if (Number.isNaN(tsNum)) return false;
    // Mercado Pago historically sends seconds, but has also used milliseconds;
    // treat a > 1e12 value as milliseconds so the window check is robust.
    const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
    if (Math.abs(Date.now() - tsMs) / 1000 > maxAgeSeconds) return false;
  }

  const manifestParts: string[] = [];
  if (dataId) manifestParts.push(`id:${dataId.toLowerCase()};`);
  if (xRequestId) manifestParts.push(`request-id:${xRequestId};`);
  manifestParts.push(`ts:${ts};`);
  const manifest = manifestParts.join("");

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(v1, "hex");
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}
