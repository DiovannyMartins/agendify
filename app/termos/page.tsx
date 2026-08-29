import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de Uso — Agendify" };

export default function TermosPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-semibold">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground">Última atualização: 29 de agosto de 2026</p>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">1. Aceitação dos termos</h2>
        <p>
          Ao criar uma conta ou usar o Agendify, você concorda com estes Termos de Uso e com a
          Política de Privacidade. Se não concordar, não utilize o serviço.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">2. O serviço</h2>
        <p>
          O Agendify é uma plataforma de agendamento online que permite que profissionais e
          pequenos negócios ofereçam reservas de serviços por uma página pública.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">3. Responsabilidades do usuário</h2>
        <p>
          Você é responsável por manter suas credenciais seguras e por garantir que os serviços e
          disponibilidades cadastrados reflitam a realidade do seu negócio. Reservas marcadas
          devem ser honradas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">4. Uso aceitável</h2>
        <p>
          É proibido usar o serviço para fins ilegais, divulgar dados de terceiros sem
          autorização ou tentar comprometer a segurança da plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">5. Suspensão</h2>
        <p>
          Podemos suspender ou encerrar contas que violem estes Termos ou que representem risco
          para a plataforma e para os usuários.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">6. Contato</h2>
        <p>Dúvidas sobre estes Termos: suporte@agendify.app.</p>
      </section>
    </article>
  );
}
