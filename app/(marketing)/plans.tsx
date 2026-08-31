"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { SecondaryCta } from "./layout";

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "Para começar a receber reservas online.",
    features: ["1 negócio", "Serviços ilimitados", "Página pública", "Dashboard"],
    cta: "Começar grátis",
  },
  {
    name: "Pro",
    price: "R$ 49",
    period: "/mês",
    description: "Para crescer com mais controle.",
    features: ["Tudo do Grátis", "Relatórios", "Lembretes automáticos", "Suporte prioritário"],
    cta: "Assinar Pro",
  },
];

export function Plans() {
  const [selected, setSelected] = useState(1);

  return (
    <section id="planos" className="mx-auto w-full max-w-4xl px-4 py-14 lg:px-6 md:py-20">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 rounded-full px-3.5 text-sm">
            Preços
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planos</h2>
          <p className="mt-4 text-muted-foreground">
            Comece grátis e evolua conforme seu negócio cresce.
          </p>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {plans.map((plan, i) => {
          const isSelected = selected === i;
          return (
            <Reveal key={plan.name} delay={i * 100}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className="block w-full cursor-pointer rounded-xl text-left"
              >
                <Card
                  className={
                    "h-full transition-all duration-300 " +
                    (isSelected
                      ? "ring-2 ring-primary hover:shadow-2xl hover:shadow-primary/10"
                      : "hover:-translate-y-1 hover:border-primary/30")
                  }
                >
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
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
