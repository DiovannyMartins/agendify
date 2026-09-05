import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { SecondaryCta } from "./layout";

const plan = {
  name: "Grátis",
  price: "R$ 0",
  period: "/mês",
  description: "Tudo o que você precisa para receber reservas online.",
  features: [
    "1 negócio",
    "Serviços ilimitados",
    "Página pública",
    "Dashboard",
    "Relatórios",
    "Lembretes automáticos",
  ],
  cta: "Começar grátis",
};

export function Plans() {
  return (
    <section id="planos" className="mx-auto w-full max-w-4xl px-4 py-14 lg:px-6 md:py-20">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 rounded-full px-3.5 text-sm">
            Preços
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Um único plano</h2>
          <p className="mt-4 text-muted-foreground">
            Sem taxas por atendimento e sem planos pagos. Comece a receber reservas hoje.
          </p>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-8 md:grid-cols-1">
        <Reveal>
          <div className="mx-auto w-full max-w-md">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm">
                      <Check className="size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <SecondaryCta className="w-full" href="/cadastro" label={plan.cta} />
                </div>
              </CardContent>
            </Card>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
