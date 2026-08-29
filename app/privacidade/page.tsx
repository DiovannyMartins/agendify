import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade — Agendify" };

export default function PrivacidadePage() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-semibold">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground">Última atualização: 29 de agosto de 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">1. Quais dados coletamos</h2>
        <p>
          Coletamos apenas os dados necessários para operar o serviço: nome, telefone/WhatsApp,
          e-mail (opcional) e observação (opcional) no momento da reserva. O profissional informa
          os dados do seu negócio (nome, endereço público, contato e configurações de agenda).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">2. Como usamos seus dados</h2>
        <p>
          Usamos os dados para criar e gerenciar reservas, exibir o painel do profissional e
          operar a página pública de agendamento. Não vendemos, alugamos ou compartilhamos seus
          dados com terceiros para fins de marketing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">3. Segurança</h2>
        <p>
          Os dados de clientes e reservas são isolados por negócio e protegidos por políticas de
          segurança no banco de dados. Dados pessoais de clientes nunca são expostos publicamente.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">4. Seus direitos</h2>
        <p>
          Em conformidade com a LGPD, você pode solicitar acessar, corrigir ou excluir seus dados
          pessoais. Entre em contato conosco para exercer seus direitos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">5. Contato</h2>
        <p>
          Em caso de dúvidas sobre esta política, entre em contato pelo e-mail
          suporte@agendify.app.
        </p>
      </section>
    </article>
  );
}
