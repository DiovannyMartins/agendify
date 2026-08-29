import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  Check,
  Clock,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cta, SecondaryCta } from "./layout";

const benefits = [
  {
    icon: CalendarClock,
    title: "Agendamento 24/7",
    description:
      "Seus clientes reservam mesmo quando você está ocupado ou fora do expediente. Sem mensagens para responder",
  },
  {
    icon: CalendarCheck,
    title: "Agenda organizada",
    description:
      "Horários calculados a partir de regras recorrentes, bloqueios e reservas existentes. Zero conflito",
  },
  {
    icon: MessageSquare,
    title: "Menos trabalho manual",
    description:
      "Chega de troca de mensagens para confirmar serviço, data e hora. O cliente reserva sozinho",
  },
  {
    icon: Sparkles,
    title: "Experiência profissional",
    description:
      "Cada negócio possui uma página pública de reservas responsiva, pronta para compartilhar",
  },
];

const howItWorks = [
  { step: "01", title: "Configure", description: "Crie seu negócio, cadastre serviços e defina sua disponibilidade." },
  { step: "02", title: "Compartilhe", description: "Divulgue seu link público pelo WhatsApp, Instagram ou redes sociais." },
  { step: "03", title: "Receba reservas", description: "Seus clientes reservam enquanto você acompanha tudo no painel." },
];

const features = [
  { icon: CalendarClock, title: "Serviços", description: "Cadastre serviços com duração e preço, desative sem perder histórico." },
  { icon: Clock, title: "Disponibilidade", description: "Dias e múltiplas faixas de atendimento recorrente em hora local." },
  { icon: CalendarCheck, title: "Bloqueios", description: "Bloqueie períodos específicos para pausas, férias e exceções." },
  { icon: Users, title: "Reservas", description: "Coleta dados do cliente e confirma o horário sem autenticação." },
  { icon: Smartphone, title: "Página pública", description: "Seu cliente escolhe o serviço, a data e o horário disponível." },
  { icon: ShieldCheck, title: "Segurança", description: "Validação no servidor, RLS e isolamento entre negócios." },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "Para começar a receber reservas online.",
    features: ["1 negócio", "Serviços ilimitados", "Página pública", "Dashboard"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 49",
    period: "/mês",
    description: "Para crescer com mais controle.",
    features: ["Tudo do Grátis", "Relatórios", "Lembretes automáticos", "Suporte prioritário"],
    highlighted: true,
  },
];

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

export default function MarketingHome() {
  return (
    <div className="flex flex-col gap-24 py-12 md:gap-32">
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center lg:px-6">
        <Badge variant="outline" className="mb-6 rounded-full px-3 py-1">
          Agendamentos online para profissionais
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Sua agenda trabalhando por você,{" "}
          <span className="text-primary">24 horas por dia</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Receba agendamentos online, organize seus horários e ofereça uma experiência
          mais profissional aos seus clientes.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Cta />
          <SecondaryCta href="/#como-funciona" />
        </div>
        <div className="mt-14 w-full max-w-3xl rounded-2xl border border-border bg-muted/40 p-4 text-left shadow-sm">
          <div className="rounded-xl bg-background p-5">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarClock className="size-4" />
                Barbearia Demo
              </div>
              <Badge variant="secondary">Disponível</Badge>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
              </div>
              <div className="grid flex-1 grid-cols-3 gap-2">
                {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30"].map((time, i) => (
                  <div
                    key={time}
                    className={
                      "rounded-lg border px-2 py-2 text-center text-sm " +
                      (i === 2
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border")
                    }
                  >
                    {time}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prova social */}
      <section className="mx-auto max-w-6xl px-4 text-center lg:px-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Feito para pequenos negócios
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-muted-foreground">
          {["Barbearias", "Salões", "Clínicas", "Autônomos", "Estúdios"].map((item) => (
            <span key={item} className="text-base font-medium">
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* Benefícios */}
      <section className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Menos mensagens, mais clientes atendidos
          </h2>
          <p className="mt-4 text-muted-foreground">
            Organize seu negócio e deixe a agenda trabalhar sozinha.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <Card key={b.title}>
              <CardHeader>
                <b.icon className="size-6 text-primary" />
                <CardTitle className="pt-3">{b.title}</CardTitle>
                <CardDescription>{b.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Como funciona</h2>
          <p className="mt-4 text-muted-foreground">Configure, compartilhe e receba reservas.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {howItWorks.map((item) => (
            <div key={item.step} className="relative rounded-2xl border border-border p-8">
              <span className="text-sm font-semibold text-primary">{item.step}</span>
              <h3 className="mt-2 text-lg font-medium">{item.title}</h3>
              <p className="mt-2 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tudo o que você precisa</h2>
          <p className="mt-4 text-muted-foreground">
            Serviços, disponibilidade, bloqueios, reservas, clientes e configurações.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4 rounded-2xl border border-border p-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="mx-auto max-w-4xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planos</h2>
          <p className="mt-4 text-muted-foreground">
            Comece grátis e evolua conforme seu negócio cresce.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.highlighted ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-semibold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Planos demonstrativos enquanto a cobrança ainda não está habilitada.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 lg:px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Perguntas frequentes
        </h2>
        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-2xl border border-border p-6">
              <h3 className="font-medium">{faq.q}</h3>
              <p className="mt-2 text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="rounded-3xl bg-primary p-10 text-center text-primary-foreground sm:p-14">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Crie sua agenda agora
          </h2>
          <p className="mx-auto mt-4 max-w-xl">
            Leva menos de um minuto para começar a receber reservas online.
          </p>
          <Link
            href="/cadastro"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-background px-6 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
          >
            Criar minha agenda
          </Link>
        </div>
      </section>
    </div>
  );
}
