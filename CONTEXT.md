# Agendify

O Agendify é uma plataforma SaaS de agendamento online para profissionais e pequenos negócios. Um profissional configura seu negócio, serviços e disponibilidade; clientes reservam serviços em uma página pública por slug. Vocabulário canônico do domínio em pt-BR.

## Language

**Negócio**:
A organização profissional que oferece serviços e recebe reservas. É o dono da agenda. No MVP, cada usuário autenticado possui exatamente um negócio.
_Avoid_: Empresa, comerciante, prestador, estabelecimento

**Cliente**:
Pessoa que reserva um serviço. Não possui conta; os dados são coletados no fluxo de reserva.
_Avoid_: Usuário, consumidor, lead, paciente

**Profissional**:
Profissional que atende dentro de um negócio. No MVP possui agenda própria (availability, slots e reservas por profissional) e é um recurso gerenciado pelo dono, sem login próprio. O dono é um profissional por padrão.
_Avoid_: Funcionário, atendente, prestador, recurso, staff, colaborador

**Equipe**:
Conjunto de profissionais ativos de um negócio. Não é uma conta; é o agrupamento de quem atende.
_Avoid_: Time, colaboradores, staff

**Serviço**:
O que o negócio oferece: nome, duração e preço. Pode ser desativado (is_active = false), nunca excluído quando há histórico.
_Avoid_: Produto, item

**Disponibilidade**:
Regra recorrente de atendimento: dia da semana e faixas de horário em hora local do negócio.
_Avoid_: Horário, expediente, abertura

**Faixa (de atendimento)**:
Intervalo contínuo de atendimento dentro de um dia (ex.: 08:00–12:00). Um dia pode ter várias faixas, que não podem se sobrepor nem atravessar meia-noite.
_Avoid_: Janela, período, slot

**Bloqueio**:
Período específico em que o negócio não atende, sem alterar a regra recorrente. Usado para pausas, compromissos, férias e exceções.
_Avoid_: Exceção, folga, indisponibilidade

**Slot**:
Um horário de início possível em que um serviço pode começar. Deriva da faixa, do intervalo de slots, da duração do serviço, da antecedência, da janela e dos conflitos.
_Avoid_: Horário, intervalo, vaga, time

**Reserva**:
O compromisso confirmado de um cliente com um serviço em um horário. Nasce como confirmed e passa por um ciclo de vida (confirmed → completed, cancelled ou no_show).
_Avoid_: Agendamento, marcação, booking, appointment

**Antecedência**:
O mínimo de tempo entre agora e o início da reserva (min_notice_minutes). Padrão: 120 minutos.
_Avoid_: Lead time, aviso prévio, notice

**Janela (futura)**:
Quantos dias à frente um cliente pode reservar (booking_window_days). Padrão: 60 dias.
_Avoid_: Prazo, alcance, horizonte, window

**Snapshot (da reserva)**:
Cópia do nome, preço e duração do serviço no momento da reserva. Garante que alterações futuras não modifiquem o histórico.
_Avoid_: Cópia, imagem, ponto no tempo

**Código público (public_code)**:
UUID aleatório de uma reserva, usado apenas na tela pública de confirmação. Nunca autoriza acesso a dados do cliente.
_Avoid_: Token, link de confirmação, código de rastreio

**No-show**:
Reserva em que o cliente não compareceu. Estado terminal que permanece no histórico.
_Avoid_: Falta, ausência, não comparecimento

**Timezone (do negócio)**:
Identificador IANA do negócio (ex.: America/Sao_Paulo). Datas são armazenadas em UTC e exibidas nesse fuso.
_Avoid_: Fuso, região, hora local
