"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBusiness } from "@/lib/business/queries";
import { createMercadoPagoProvider } from "./mercado-pago";
import { fetchCurrentSubscription } from "./get-subscription";
import {
  startUpgrade as buildStartUpgrade,
  type SaveSubscription,
  type StartUpgradeResult,
} from "./start-upgrade";

// Writes the new subscription row. The owner RLS policy only allows SELECT on
// `subscriptions`, so the server action uses the service-role client (which
// bypasses RLS) to persist the preapproval the webhook (issue #24) will later
// authorize.
const saveSubscriptionViaAdmin: SaveSubscription = async (input) => {
  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").insert({
    business_id: input.businessId,
    mp_preapproval_id: input.mpPreapprovalId,
    plan: input.plan,
    status: input.status,
  });
  if (error) throw new Error(error.message);
};

// Server action called by the "Fazer upgrade" button. Returns the Mercado Pago
// `init_point` so the client can redirect the payer to the checkout (sandbox in
// dev). Reads `MERCADO_PAGO_ACCESS_TOKEN`; when unset it fails closed with a
// friendly message rather than attempting a real call.
export async function startUpgrade(): Promise<StartUpgradeResult> {
  const business = await getCurrentBusiness();
  if (!business) {
    return { ok: false, code: "NO_BUSINESS", message: "Configure seu negócio antes de assinar." };
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "O pagamento ainda não está configurado neste ambiente.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const provider = createMercadoPagoProvider({ accessToken });
  const backUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/configuracoes`;

  return buildStartUpgrade({
    business: { id: business.id, plan: business.plan },
    provider,
    saveSubscription: saveSubscriptionViaAdmin,
    fetchSubscription: fetchCurrentSubscription,
    backUrl,
    payerEmail: user?.email,
  });
}
