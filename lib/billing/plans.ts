// Plan metadata for the dashboard "Plano" section (ADR 0008). Mirrors the
// landing page plans (app/(marketing)/plans.tsx) and CONTEXT.md. Keep these
// descriptions and privilege lists in sync with both.
import type { BillingPlan } from "./types";

export interface PlanInfo {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
}

export const PLAN_INFO: Record<BillingPlan, PlanInfo> = {
  free: {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "O essencial para receber reservas online.",
    features: [
      "Página pública",
      "Dashboard",
      "Serviços ilimitados",
      "Clientes e histórico",
      "Bloqueios",
      "Gestão de reservas",
      "Cancelamento self-service",
    ],
  },
  pro: {
    name: "PROFISSIONAL",
    price: "R$ 19",
    period: "/mês",
    description: "Tudo do Grátis, mais recursos para fazer o negócio crescer.",
    features: [
      "Relatórios",
      "Lembretes automáticos",
      "Gestão da lista de espera",
      "Exportação Google Calendar/.ics",
    ],
  },
};
