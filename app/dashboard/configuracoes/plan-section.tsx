import { Check, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isProPlan } from "@/lib/plan/plan";
import { getSubscription } from "@/lib/billing/get-subscription";
import { PLAN_INFO } from "@/lib/billing/plans";
import { isSubscriptionInGrace, type BillingPlan, type SubscriptionStatus } from "@/lib/billing/types";
import { UpgradeButton } from "./upgrade-button";
import { CancelSubscriptionButton } from "./cancel-subscription-button";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  pending: "Pagamento pendente",
  authorized: "Assinatura ativa",
  paused: "Assinatura pausada",
  cancelled: "Assinatura cancelada",
};

const STATUS_BADGE: Record<SubscriptionStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  authorized: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export async function PlanSection({ business }: { business: { id: string; plan: BillingPlan } }) {
  const { plan, subscription } = await getSubscription(business);
  const info = PLAN_INFO[plan];
  const isPro = isProPlan(plan);
  const status = subscription?.status ?? null;

  const badge = status
    ? STATUS_BADGE[status]
    : isPro
      ? { label: "Ativo", variant: "default" as const }
      : { label: "Atual", variant: "secondary" as const };

  return (
    <section>
      <h2 className="text-xl font-semibold">Plano</h2>
      <p className="mt-1 text-muted-foreground">
        Seu plano atual, os privilégios incluídos e o status da assinatura.
      </p>
      <div className="mt-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
              <Crown className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{info.name}</p>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {info.price}
                {info.period} · {info.description}
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {info.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="size-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-muted-foreground">
          Status da assinatura:{" "}
          <span className="font-medium text-foreground">
            {subscription ? STATUS_LABEL[subscription.status] : "Sem assinatura"}
          </span>
        </p>

        {!isPro && (
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Destrave relatórios, lembretes automáticos, gestão da lista de espera e exportação de agenda.
            </p>
            <UpgradeButton />
          </div>
        )}

        {isPro && isSubscriptionInGrace(subscription?.status) && (
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Mudou de ideia? Reative a assinatura para continuar no plano PROFISSIONAL.
            </p>
            <UpgradeButton label="Assinar novamente" />
          </div>
        )}

        {subscription?.status === "authorized" && (
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Quer parar de ser cobrado? Cancelar encerra a assinatura e, após a carência, devolve o negócio ao plano Grátis.
            </p>
            <CancelSubscriptionButton />
          </div>
        )}
      </div>
    </section>
  );
}
