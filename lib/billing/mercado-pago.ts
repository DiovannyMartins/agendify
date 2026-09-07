// Mercado Pago provider implementation (ADR 0008). Behind the `BillingProvider`
// seam; nothing outside `lib/billing/` imports this directly. Creates a
// recurring preapproval (R$ 19/mês) and returns its `init_point`. The access
// token is TEST-* in sandbox (dev) and APP_USR-* in production; the API base
// stays the same. `apiBaseUrl` is injectable so the unit tests can point at a
// stub server or stub `fetch` without a real network call.
import type { BillingPlan } from "./types";
import type { BillingProvider, CreatePreapprovalInput, CreatePreapprovalResult } from "./provider";

const DEFAULT_API_BASE_URL = "https://api.mercadopago.com";

// The recurring subscription terms per plan. Only the PROFISSIONAL plan (R$ 19)
// is sold as a subscription; a `free` plan has no preapproval, so it is rejected.
const SUBSCRIPTION_TERMS: Record<BillingPlan, { amount: number; label: string } | null> = {
  free: null,
  pro: { amount: 19, label: "PROFISSIONAL" },
};

export interface MercadoPagoConfig {
  accessToken: string;
  apiBaseUrl?: string;
}

export function createMercadoPagoProvider(config: MercadoPagoConfig): BillingProvider {
  const apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;

  return {
    async createPreapproval(input: CreatePreapprovalInput): Promise<CreatePreapprovalResult> {
      const terms = SUBSCRIPTION_TERMS[input.plan];
      if (!terms) {
        throw new Error(`Mercado Pago does not sell a subscription for the ${input.plan} plan`);
      }

      const res = await fetch(`${apiBaseUrl}/preapproval`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: `Assinatura ${terms.label} - Agendify (R$ ${terms.amount}/mês)`,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: terms.amount,
            currency_id: "BRL",
          },
          back_url: input.backUrl,
          external_reference: input.externalReference,
          ...(input.payerEmail ? { payer_email: input.payerEmail } : {}),
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const err = (await res.json()) as { message?: string };
          detail = err?.message ?? "";
        } catch {
          // Non-JSON error body; the status is enough.
        }
        throw new Error(
          `Mercado Pago preapproval failed (${res.status})${detail ? `: ${detail}` : ""}`,
        );
      }

      const body = (await res.json()) as { id?: string; init_point?: string };
      const preapprovalId = body.id ?? "";
      const initPoint = body.init_point ?? "";
      if (!preapprovalId || !initPoint) {
        throw new Error("Mercado Pago preapproval response missing id/init_point");
      }
      return { preapprovalId, initPoint };
    },
  };
}
