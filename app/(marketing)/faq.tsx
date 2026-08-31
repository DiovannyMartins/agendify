"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Como funciona o agendamento?",
    a: "Você configura serviços e horários de atendimento. Seus clientes escolhem a data e o horário na sua página pública e a reserva aparece imediatamente no seu painel.",
  },
  {
    q: "Posso cancelar um horário?",
    a: "Sim. Você cancela, conclui ou marca ausência pelo dashboard. Mudanças de status liberam o horário para novas reservas.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. A validação acontece no servidor, os dados de clientes são isolados por negócio e tratados segundo boas práticas de privacidade.",
  },
  {
    q: "Preciso instalar algo?",
    a: "Não. O Agendify funciona direto no navegador, no celular ou no computador. Você só precisa de um link para compartilhar.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={faq.q}
            className={cn(
              "overflow-hidden rounded-2xl border border-border bg-background transition-colors duration-300",
              isOpen && "border-primary/30 bg-muted/20",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-medium">{faq.q}</span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                  isOpen && "rotate-180 text-primary",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-muted-foreground">{faq.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
