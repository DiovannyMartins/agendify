import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "@/lib/booking/anti-bot";

function setSecret(value: string | undefined) {
  if (value === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
  } else {
    process.env.TURNSTILE_SECRET_KEY = value;
  }
}

describe("verifyTurnstile (§17 anti-bot)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setSecret(undefined);
  });

  it("is disabled (fail-open) when no secret is configured", async () => {
    setSecret(undefined);
    const result = await verifyTurnstile();
    expect(result.ok).toBe(true);
  });

  it("rejects a missing token when the secret is configured (fail-closed)", async () => {
    setSecret("secret");
    const result = await verifyTurnstile();
    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts a valid token when the provider verifies it", async () => {
    setSecret("secret");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const result = await verifyTurnstile("valid-token");
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects a token the provider marks as invalid", async () => {
    setSecret("secret");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
        status: 200,
      }),
    );
    expect((await verifyTurnstile("bad-token")).ok).toBe(false);
  });

  it("fails closed when the provider is unreachable", async () => {
    setSecret("secret");
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    expect((await verifyTurnstile("token")).ok).toBe(false);
  });

  it("fails closed when the provider returns a non-2xx status", async () => {
    setSecret("secret");
    vi.mocked(fetch).mockResolvedValue(new Response("error", { status: 500 }));
    expect((await verifyTurnstile("token")).ok).toBe(false);
  });
});
