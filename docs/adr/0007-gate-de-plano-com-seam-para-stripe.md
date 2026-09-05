# Gate de plano com seam para Stripe (sem cobrança ainda)

> **Status: REVERTIDO (superseded).** Removido em favor de um modelo sem planos (migração `20260914000000_remove_team_and_plan.sql`). `business.plan`, o limite de profissionais e o upgrade self-serve foram retirados; relatórios e lembretes tornaram-se recursos grátis.

O plano vive em `business.plan` (`free` | `pro`) e é aplicado como gate de limites no servidor: Free = 1 profissional, Pro = 3. Não há cobrança real nesta fase; o upgrade self-serve fica ativo apenas em dev/preview, e em produção o plano é ajustado manualmente no banco.

A limitação de equipe é o primeiro limite de plano e liga Billing a Equipe. Cobrança real (Stripe) é um subsistema ortogonal e pesado; assentar o modelo de plano e os limites agora, com uma seam clara (validamos em `lib/team/plan.ts` + `lib/team/actions.ts`), permite integrar Stripe depois sem refazer o modelo. Em dev/preview, a troca de plano (upgrade self-serve) entra via `setPlan`; em produção o ajuste é manual no banco. Alternativa — integrar Stripe já — foi descartada por exigir conta/chaves/webhooks sem corresponder ao estado atual sem cobrança. A reversão é cara só na parte de Stripe; o modelo de plano é fácil de ajustar.
