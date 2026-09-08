// The upgrade seam (ADR 0008). `startUpgrade` creates a Mercado Pago preapproval
// for the PROFISSIONAL plan (R$ 19/mês) through the `BillingProvider` interface
// and persists a `pending` subscription row, then returns the checkout
// `init_point` for the caller to redirect to. The provider, the
// subscription-save and the (optional) subscription read are injectable, so this
// seam is testable without Mercado Pago or a database. The plan only becomes
// `pro` once the preapproval is `authorized` (webhook lifecycle, issue #24) —
// this function never touches `businesses.plan`.
import { isProPlan } from "@/lib/plan/plan";
import type { BillingPlan, SubscriptionStatus } from "./types";
import type { BillingProvider } from "./provider";
import type { FetchSubscription } from "./get-subscription";

export type SaveSubscription = (input: {
  businessId: string;
  mpPreapprovalId: string;
  plan: BillingPlan;
  status: SubscriptionStatus;
}) => Promise<void>;

export type StartUpgradeResult =
  | { ok: true; initPoint: string }
  | { ok: false; code: string; message: string };

export interface StartUpgradeDeps {
  business: { id: string; plan: BillingPlan };
  provider: BillingProvider;
  saveSubscription: SaveSubscription;
  backUrl: string;
  payerEmail?: string;
  // Where Mercado Pago POSTs subscription webhook notifications (the tunnel /
  // deployed `/api/webhooks/mercadopago` URL). Required for subscriptions.
  notificationUrl?: string;
  // When provided, guards against starting a second preapproval while one is
  // still pending (avoids orphaned preapprovals from double-clicking "upgrade").
  fetchSubscription?: FetchSubscription;
}

export async function startUpgrade(deps: StartUpgradeDeps): Promise<StartUpgradeResult> {
  const { business, provider, saveSubscription, backUrl, payerEmail, notificationUrl, fetchSubscription } = deps;

  if (isProPlan(business.plan)) {
    return { ok: false, code: "ALREADY_PRO", message: "Sua conta já está no plano PROFISSIONAL." };
  }

  if (fetchSubscription) {
    const existing = await fetchSubscription(business.id);
    if (existing?.status === "pending") {
      return {
        ok: false,
        code: "UPGRADE_PENDING",
        message: "Você já iniciou uma assinatura. Conclua o pagamento para ativá-la.",
      };
    }
  }

  let created;
  try {
    created = await provider.createPreapproval({
      plan: "pro",
      externalReference: business.id,
      payerEmail,
      backUrl,
      notificationUrl,
    });
  } catch (err) {
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      message: err instanceof Error ? err.message : "Não foi possível iniciar a assinatura.",
    };
  }

  try {
    await saveSubscription({
      businessId: business.id,
      mpPreapprovalId: created.preapprovalId,
      plan: "pro",
      status: "pending",
    });
  } catch (err) {
    return {
      ok: false,
      code: "SAVE_ERROR",
      message: err instanceof Error ? err.message : "Não foi possível salvar a assinatura.",
    };
  }

  return { ok: true, initPoint: created.initPoint };
}
