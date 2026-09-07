import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

const plans = [
  {
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
    cta: "Começar grátis",
    highlighted: false,
  },
  {
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
    cta: "Assinar PROFISSIONAL",
    highlighted: true,
  },
];

export function Plans() {
  return (
    <section id="planos" className="mx-auto w-full max-w-4xl px-4 py-14 lg:px-6 md:py-20">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 rounded-full px-3.5 text-sm">
            Preços
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Dois planos para o seu negócio
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece grátis e evolua para o PROFISSIONAL quando precisar de relatórios,
            lembretes automáticos, gestão da lista de espera e exportação de agenda.
          </p>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {plans.map((plan, i) => (
          <Reveal key={plan.name} delay={i * 100} className="h-full">
            <Card
              className={cn(
                "h-full",
                plan.highlighted && "border-primary/40 shadow-xl shadow-primary/5",
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.highlighted && (
                    <Badge className="rounded-full px-2.5 py-0.5 text-xs">
                      <Sparkles className="size-3" />
                      Recomendado
                    </Badge>
                  )}
                </div>
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
                  <Link
                    href="/cadastro"
                    className={cn(
                      buttonVariants({
                        variant: plan.highlighted ? "default" : "outline",
                        size: "lg",
                      }),
                      "w-full px-6",
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
