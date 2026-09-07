import { describe, expect, it, vi } from "vitest";
import { startUpgrade } from "./start-upgrade";
import type { BillingProvider, CreatePreapprovalResult } from "./provider";

const BUSINESS = { id: "biz_1", plan: "free" as const };

function makeProvider(result: CreatePreapprovalResult) {
  return {
    createPreapproval: vi.fn(async () => result),
  } satisfies BillingProvider;
}

describe("startUpgrade (ADR 0008)", () => {
  it("creates a pending preapproval and returns the init_point", async () => {
    const provider = makeProvider({ preapprovalId: "mp_123", initPoint: "https://mp.example/checkout" });
    const saveSubscription = vi.fn(async () => undefined);

    const result = await startUpgrade({
      business: BUSINESS,
      provider,
      saveSubscription,
      backUrl: "https://app.example/dashboard/configuracoes",
      payerEmail: "owner@example.com",
    });

    expect(result).toEqual({ ok: true, initPoint: "https://mp.example/checkout" });
    expect(provider.createPreapproval).toHaveBeenCalledWith({
      plan: "pro",
      externalReference: "biz_1",
      payerEmail: "owner@example.com",
      backUrl: "https://app.example/dashboard/configuracoes",
    });
    expect(saveSubscription).toHaveBeenCalledWith({
      businessId: "biz_1",
      mpPreapprovalId: "mp_123",
      plan: "pro",
      status: "pending",
    });
  });

  it("persists a pending subscription for the pro plan", async () => {
    const provider = makeProvider({ preapprovalId: "mp_456", initPoint: "https://mp.example/x" });
    const saveSubscription = vi.fn(async () => undefined);

    await startUpgrade({ business: BUSINESS, provider, saveSubscription, backUrl: "https://app.example" });

    expect(saveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ mpPreapprovalId: "mp_456", plan: "pro", status: "pending" }),
    );
  });

  it("refuses to upgrade a business that is already pro", async () => {
    const provider = makeProvider({ preapprovalId: "mp_789", initPoint: "https://mp.example/y" });
    const saveSubscription = vi.fn(async () => undefined);

    const result = await startUpgrade({
      business: { id: "biz_1", plan: "pro" },
      provider,
      saveSubscription,
      backUrl: "https://app.example",
    });

    expect(result).toEqual({ ok: false, code: "ALREADY_PRO", message: expect.any(String) });
    expect(provider.createPreapproval).not.toHaveBeenCalled();
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it("refuses to start a second preapproval while one is pending", async () => {
    const provider = makeProvider({ preapprovalId: "mp_999", initPoint: "https://mp.example/p" });
    const saveSubscription = vi.fn(async () => undefined);
    const fetchSubscription = vi.fn(async () => ({
      mpPreapprovalId: "mp_pending",
      status: "pending" as const,
      plan: "pro" as const,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    }));

    const result = await startUpgrade({
      business: BUSINESS,
      provider,
      saveSubscription,
      fetchSubscription,
      backUrl: "https://app.example",
    });

    expect(result).toEqual({ ok: false, code: "UPGRADE_PENDING", message: expect.any(String) });
    expect(provider.createPreapproval).not.toHaveBeenCalled();
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it("proceeds when an existing subscription is not pending", async () => {
    const provider = makeProvider({ preapprovalId: "mp_777", initPoint: "https://mp.example/q" });
    const saveSubscription = vi.fn(async () => undefined);
    const fetchSubscription = vi.fn(async () => null);

    const result = await startUpgrade({
      business: BUSINESS,
      provider,
      saveSubscription,
      fetchSubscription,
      backUrl: "https://app.example",
    });

    expect(result).toEqual({ ok: true, initPoint: "https://mp.example/q" });
    expect(provider.createPreapproval).toHaveBeenCalled();
  });

  it("maps a provider failure to PROVIDER_ERROR and never saves", async () => {
    const provider = {
      createPreapproval: vi.fn(async () => {
        throw new Error("Mercado Pago preapproval failed (401)");
      }),
    } satisfies BillingProvider;
    const saveSubscription = vi.fn(async () => undefined);

    const result = await startUpgrade({ business: BUSINESS, provider, saveSubscription, backUrl: "https://app.example" });

    expect(result).toEqual({ ok: false, code: "PROVIDER_ERROR", message: "Mercado Pago preapproval failed (401)" });
    expect(saveSubscription).not.toHaveBeenCalled();
  });

  it("maps a save failure to SAVE_ERROR", async () => {
    const provider = makeProvider({ preapprovalId: "mp_000", initPoint: "https://mp.example/z" });
    const saveSubscription = vi.fn(async () => {
      throw new Error("insert failed");
    });

    const result = await startUpgrade({ business: BUSINESS, provider, saveSubscription, backUrl: "https://app.example" });

    expect(result).toEqual({ ok: false, code: "SAVE_ERROR", message: "insert failed" });
  });
});
