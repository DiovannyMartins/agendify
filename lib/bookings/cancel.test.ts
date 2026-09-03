import { describe, expect, it } from "vitest";
import { deriveCancelToken, verifyCancelToken } from "@/lib/bookings/cancel";

const SECRET = "test-secret-abc123";
const CODE = "65925dbb-ab9d-42eb-832a-030c1b28d1e4";

describe("deriveCancelToken (INC-3: token derivado da public_code)", () => {
  it("derives a deterministic hex token from the public code and secret", () => {
    const token = deriveCancelToken(SECRET, CODE);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(deriveCancelToken(SECRET, CODE)).toBe(token);
  });

  it("produces a different token for a different public code", () => {
    const other = "65925dbb-ab9d-42eb-832a-030c1b28d1e5";
    expect(deriveCancelToken(SECRET, CODE)).not.toBe(deriveCancelToken(SECRET, other));
  });

  it("produces a different token for a different secret", () => {
    const token = deriveCancelToken(SECRET, CODE);
    const otherSecret = deriveCancelToken("another-secret", CODE);
    expect(token).not.toBe(otherSecret);
  });

  it("never returns the public code itself or any personal data", () => {
    const token = deriveCancelToken(SECRET, CODE);
    expect(token).not.toContain(CODE);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });
});

describe("verifyCancelToken (INC-3)", () => {
  it("accepts the exact derived token", () => {
    const token = deriveCancelToken(SECRET, CODE);
    expect(verifyCancelToken(SECRET, CODE, token)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = deriveCancelToken(SECRET, CODE);
    const tampered = token.slice(0, 62) + "0" + (token.endsWith("0") ? "1" : "0");
    expect(verifyCancelToken(SECRET, CODE, tampered)).toBe(false);
  });

  it("rejects the wrong public code for the token", () => {
    const token = deriveCancelToken(SECRET, CODE);
    expect(verifyCancelToken(SECRET, "65925dbb-ab9d-42eb-832a-030c1b28d1e5", token)).toBe(false);
  });

  it("rejects when the wrong secret is used", () => {
    const token = deriveCancelToken("some-other-secret", CODE);
    expect(verifyCancelToken(SECRET, CODE, token)).toBe(false);
  });

  it("is fail-closed on missing secret or token", () => {
    expect(verifyCancelToken("", CODE, deriveCancelToken(SECRET, CODE))).toBe(false);
    expect(verifyCancelToken(SECRET, CODE, "")).toBe(false);
  });
});
