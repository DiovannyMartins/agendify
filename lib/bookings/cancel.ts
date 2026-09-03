import { createHmac, timingSafeEqual } from "node:crypto";

// Cancellation capability for the customer flow (INC-3). The token is derived
// from a booking's `public_code` via HMAC-SHA256 with a server-only secret, so
// only the holder of the derived token (the confirmation screen, which already
// holds the code) can cancel that booking. The token is never stored on the row
// and never returned by the public lookup; it is recomputed on the server from
// the code + secret. It encodes no personal data (§16: the public code must
// never authorize access to customer data; the derived token is a separate
// capability for the cancel action only).
//
// `deriveCancelToken` is deterministic so the confirmation page and the cancel
// server action agree without any storage. `verifyCancelToken` is fail-closed:
// missing secret, missing/malformed token or tampering all yield false.

export function deriveCancelToken(secret: string, publicCode: string): string {
  if (!secret) return "";
  return createHmac("sha256", secret).update(publicCode).digest("hex");
}

export function verifyCancelToken(secret: string, publicCode: string, token: string): boolean {
  const expected = deriveCancelToken(secret, publicCode);
  if (!expected || !token) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
