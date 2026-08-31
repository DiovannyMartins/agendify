<!-- Cabeçalho repetido no DOCX: AGENDIFY  |  ESPECIFICAÇÃO V2.0 -->

**PROJETO FULL STACK / SAAS**

# AGENDIFY

**Agendamentos online para profissionais e pequenos negócios**

Landing page + aplicação full stack + dashboard administrativo

**ESPECIFICAÇÃO DE PRODUTO E IMPLEMENTAÇÃO**

**Versão 2.0 - implementation-ready**

**Objetivo desta versão**

Transformar o conceito original do Agendify em uma especificação suficientemente precisa para implementação, reduzindo decisões improvisadas durante banco de dados, autenticação, disponibilidade, reservas, segurança, testes e deploy.

**Status:** As regras marcadas como “normativas” neste documento devem ser tratadas como a fonte de verdade do MVP. Mudanças posteriores devem ser registradas como alteração de escopo.

Escopo: MVP de portfólio com base sólida para evolução para SaaS real

<!-- Quebra de página da capa no DOCX -->

## 0. Como usar este documento

Esta versão preserva a proposta central do documento original e fecha as lacunas necessárias para a implementação. Onde a versão anterior descrevia uma intenção, esta versão define a regra de negócio, o comportamento esperado ou a restrição técnica correspondente.

- **Normativo -** regra que deve ser implementada no MVP.
- **Pós-MVP -** funcionalidade deliberadamente fora do primeiro lançamento.
- **Decisão técnica -** escolha de arquitetura usada para evitar ambiguidade e retrabalho.
- **Critério de aceite -** condição objetiva para considerar a funcionalidade concluída.

**Limite da expressão “100% pronto”:** O documento está fechado para implementação do escopo definido. Nenhum software é imune a ajustes descobertos em testes ou uso real; qualquer mudança de comportamento deverá ser tratada como nova decisão de produto, não como lacuna desta especificação.

### 0.1 Decisões que fecham as ambiguidades do MVP

| **Tema** | **Decisão normativa** |
| --- | --- |
| Modelo do negócio | Um usuário autenticado é proprietário de exatamente um negócio no MVP. A estrutura separa usuário e negócio para permitir equipe no futuro. |
| Confirmação da reserva | Ao concluir a reserva, o cliente vê uma tela de confirmação. E-mail/WhatsApp automáticos permanecem pós-MVP. |
| Status inicial | Uma reserva válida nasce como “confirmed”. Não existe aprovação manual no fluxo padrão do MVP. |
| Cancelamento pelo cliente | Fora do MVP. O profissional cancela pelo dashboard. |
| Bloqueios | Bloqueios manuais de agenda entram no MVP para pausas, compromissos, férias e exceções. |
| Timezone | Cada negócio possui timezone IANA. Datas são convertidas para UTC no banco e exibidas no timezone do negócio. |
| Slots | Intervalo padrão entre inícios de horários: 30 minutos, configurável no perfil do negócio. |
| Antecedência | Padrão: 120 minutos. Configurável pelo negócio. |
| Janela futura | Padrão: 60 dias. Configurável de 1 a 180 dias. |
| Concorrência | Sobreposição de reservas é impedida por validação no servidor e por constraint no PostgreSQL. |
| Histórico | Reserva armazena snapshots de nome do serviço, preço e duração; alterações futuras não modificam o histórico. |
| Exclusão de serviço | Serviços com histórico não são apagados; são desativados por is_active=false. |

## 1. Visão do produto

O Agendify é uma plataforma SaaS de agendamento online criada para profissionais e pequenos negócios que precisam organizar horários e permitir que clientes reservem serviços sem depender de mensagens manuais no WhatsApp ou em redes sociais.

### Elevator pitch

**Proposta:** “Seu negócio aberto para agendamentos 24 horas por dia. Seus clientes escolhem o serviço, a data e o horário; você acompanha tudo em um painel simples.”

### 1.1 Problema que o produto resolve

- Agendamentos manuais consomem tempo e podem gerar conflito de horários.
- Clientes precisam esperar resposta para descobrir disponibilidade.
- Profissionais perdem oportunidades quando não conseguem responder imediatamente.
- Faltas e esquecimentos prejudicam faturamento e organização.
- Dados de clientes, serviços e horários ficam espalhados em múltiplos canais.

### 1.2 Solução

O profissional configura o negócio, serviços, disponibilidade recorrente e bloqueios. O Agendify gera uma página pública por slug. O cliente seleciona serviço, data e horário; o servidor valida novamente a disponibilidade e cria a reserva de forma atômica. A reserva aparece imediatamente no dashboard do profissional.

## 2. Público-alvo

| **Segmento** | **Necessidade principal** | **Exemplo** |
| --- | --- | --- |
| Barbearias | Organizar cortes e evitar choques de horário | Corte, barba e combos |
| Salões de beleza | Gerenciar diferentes serviços | Cabelo, unhas, maquiagem |
| Clínicas e consultórios pequenos | Controlar agenda e disponibilidade | Consultas e retornos |
| Profissionais autônomos | Reduzir mensagens e centralizar reservas | Personal, massagista, fotógrafo |
| Pequenos estúdios | Distribuir horários por serviço | Tatuagem, pilates, estética |

### 2.1 Persona inicial recomendada

João, barbeiro autônomo, 28 anos. Recebe reservas pelo WhatsApp e Instagram, perde tempo respondendo perguntas sobre disponibilidade e quer uma forma simples de deixar o cliente marcar sozinho. Precisa de uma solução fácil de configurar, boa no celular e sem exigência de conhecimento técnico.

## 3. Proposta de valor

| **Pilar** | **Valor entregue** |
| --- | --- |
| Agendamento 24/7 | Clientes reservam mesmo quando o profissional está ocupado ou fora do expediente. |
| Agenda organizada | Horários são calculados a partir de regras recorrentes, bloqueios e reservas existentes. |
| Menos trabalho manual | Reduz a troca de mensagens para confirmar serviço, data e hora. |
| Experiência profissional | Cada negócio possui página pública de reservas responsiva. |
| Base para crescimento | Arquitetura preparada para lembretes, pagamentos, equipe, relatórios e calendário externo. |

## 4. Experiência do usuário

### 4.1 Fluxo do cliente

1. Acessa /\[slug\].
2. Visualiza nome do negócio, descrição e serviços ativos.
3. Escolhe um serviço.
4. Seleciona uma data dentro da janela permitida.
5. Visualiza apenas horários realmente disponíveis.
6. Seleciona um horário.
7. Informa nome, WhatsApp/telefone e, opcionalmente, e-mail e observação.
8. Confirma a reserva.
9. O servidor revalida regras e concorrência antes de gravar.
10. Recebe uma tela de confirmação com serviço, data, hora e contato do negócio; a URL usa public_code aleatório.

**MVP:** A “confirmação” ao cliente é uma página da aplicação. Notificações automáticas por e-mail ou WhatsApp não fazem parte do MVP.

### 4.2 Fluxo do profissional

1. Cria conta por e-mail e senha.
2. Confirma o e-mail em produção e entra no dashboard.
3. Conclui o setup do negócio: nome, slug, telefone, timezone e regras de agenda.
4. Cadastra pelo menos um serviço.
5. Configura disponibilidade recorrente.
6. Adiciona bloqueios quando necessário.
7. Compartilha o link público.
8. Visualiza reservas futuras no dashboard.
9. Cancela, conclui ou marca ausência (no-show) conforme o atendimento.

### 4.3 Estados obrigatórios de interface

- **Loading -** skeleton ou indicador durante carregamentos relevantes.
- **Empty -** mensagem útil quando não há serviços, disponibilidade ou reservas.
- **Success -** confirmação clara após operações.
- **Validation error -** mensagens próximas aos campos, sem perder dados preenchidos.
- **Server error -** mensagem genérica para o usuário e log técnico no servidor.
- **No availability -** explicar que não há horários e sugerir outra data.
- **Not found -** slug inexistente/inativo retorna página 404 amigável.

## 5. Estrutura da landing page

| **Seção** | **Conteúdo mínimo** |
| --- | --- |
| Navbar | Logo, Recursos, Como funciona, Preços, Entrar e CTA “Começar grátis”. |
| Hero | Headline, explicação curta, CTA e mockup do produto. |
| Prova social | Somente dados reais ou elementos claramente marcados como demonstração. |
| Benefícios | Agendamento 24/7, agenda organizada, menos trabalho manual e experiência profissional. |
| Como funciona | Configure, compartilhe e receba reservas. |
| Demonstração | Prévia da página pública e dashboard. |
| Recursos | Serviços, disponibilidade, bloqueios, reservas, clientes e configurações. |
| Planos | Free/Pro podem ser demonstrativos enquanto cobrança não existir; deixar isso explícito. |
| FAQ | Uso, cancelamento, disponibilidade, dados e segurança. |
| CTA final | “Criar minha agenda”. |
| Footer | Produto, suporte, privacidade/termos e redes sociais. |

### 5.1 Copy-base do hero

Headline: Sua agenda trabalhando por você, 24 horas por dia.

Subheadline: Receba agendamentos online, organize seus horários e ofereça uma experiência mais profissional aos seus clientes.

## 6. Funcionalidades do MVP

| **Funcionalidade** | **Objetivo** | **Prioridade** |
| --- | --- | --- |
| Autenticação | Cadastro, confirmação de e-mail em produção, login, logout e recuperação de senha. | Essencial |
| Perfil do negócio | Nome, slug, descrição, contato, timezone e parâmetros da agenda. | Essencial |
| Serviços | Criar, editar e desativar serviços com duração e preço. | Essencial |
| Disponibilidade | Definir dias e múltiplas faixas de atendimento recorrente. | Essencial |
| Bloqueios | Bloquear períodos específicos sem alterar a regra recorrente. | Essencial |
| Página pública | Exibir negócio, serviços ativos, datas e slots disponíveis. | Essencial |
| Reserva | Coletar dados do cliente e confirmar um slot sem autenticação do cliente. | Essencial |
| Dashboard | Exibir próximos agendamentos e resumo da agenda. | Essencial |
| Gestão de reservas | Cancelar, concluir e marcar no-show. | Essencial |
| Clientes | Manter histórico mínimo por negócio sem área autenticada do cliente. | Alta |
| Responsividade | Experiência completa em celular, tablet e desktop. | Alta |
| Segurança | Validação server-side, RLS e isolamento entre negócios. | Essencial |
| Testes | Cobrir algoritmo de horários, concorrência, RLS e principais fluxos E2E. | Essencial |

### 6.1 Fora do MVP

- Pagamento antecipado, sinal e cobrança recorrente.
- Lembretes por e-mail, SMS ou WhatsApp.
- Equipe com múltiplos profissionais/agendas.
- Integração com Google Calendar.
- Cupons, campanhas, lista de espera e relatórios avançados.
- Aplicativo nativo/PWA como requisito obrigatório.
- Cancelamento ou reagendamento self-service pelo cliente.

## 7. Stack tecnológica e arquitetura

| **Tecnologia** | **Responsabilidade** |
| --- | --- |
| Next.js + React + TypeScript | Aplicação web, rotas, Server Components/Actions ou Route Handlers e lógica de servidor. |
| Tailwind CSS | Estilos responsivos e design system. |
| shadcn/ui + Lucide | Componentes de interface e ícones. |
| React Hook Form + Zod | Formulários e validação compartilhada de entrada. |
| Supabase Auth | Autenticação do profissional. |
| Supabase PostgreSQL | Persistência, constraints, RLS e consultas. |
| Vercel | Deploy, previews e hospedagem. |
| Git + GitHub | Versionamento, revisão e portfólio. |

### 7.1 Princípios de arquitetura

- A interface nunca é a fonte final de verdade para disponibilidade.
- Toda mutação relevante é validada no servidor com Zod e regras de domínio.
- A criação da reserva é protegida no banco contra sobreposição, mesmo sob concorrência.
- A chave service-role do Supabase existe apenas no servidor e nunca é exposta ao navegador.
- Operações do dashboard respeitam autenticação e RLS.
- Fluxos públicos acessam apenas dados necessários; dados de clientes nunca são públicos.
- Migrations do banco são versionadas no repositório.

### 7.2 Fluxo arquitetural simplificado

```text
Navegador
  -> Next.js (UI)
      -> Server Action / Route Handler
          -> Zod + regras de domínio
              -> Supabase PostgreSQL / Auth
                  -> RLS + constraints + transação

Dashboard autenticado -> Supabase com sessão do usuário
Fluxo público de reserva -> função server-only com credencial privilegiada e validação estrita
```

### 7.3 Estrutura de pastas recomendada

```sql
app/
  (marketing)/page.tsx
  (auth)/login/page.tsx
  (auth)/cadastro/page.tsx
  (auth)/recuperar-senha/page.tsx
  dashboard/
    page.tsx
    servicos/page.tsx
    agenda/page.tsx
    bloqueios/page.tsx
    configuracoes/page.tsx
  [slug]/
    page.tsx
    confirmacao/page.tsx
lib/
  supabase/{client,server,admin}.ts
  validation/
  booking/{availability,create-booking,status}.ts
  auth/
components/
actions/
tests/
```

## 8. Modelo de dados canônico

O schema abaixo substitui a versão conceitual anterior e deve ser tratado como o modelo-base do MVP. UUID é usado como identificador. Valores monetários são inteiros em centavos para evitar erro de ponto flutuante.

### 8.1 Relacionamentos

```text
auth.users 1---1 profiles
profiles   1---1 businesses (MVP: owner_id único)
businesses 1---N services
businesses 1---N availability
businesses 1---N availability_blocks
businesses 1---N customers
businesses 1---N bookings
services   1---N bookings
customers  1---N bookings
```

### 8.2 Tabela profiles

| **Coluna** | **Tipo** | **Regra** |
| --- | --- | --- |
| id | uuid | PK e FK para auth.users.id; ON DELETE CASCADE. |
| display_name | text | 2-80 caracteres. |
| created_at | timestamptz | default now(). |
| updated_at | timestamptz | atualizado pela aplicação/trigger. |

### 8.3 Tabela businesses

| **Coluna** | **Tipo** | **Regra** |
| --- | --- | --- |
| id | uuid | PK, default gen_random_uuid(). |
| owner_id | uuid | FK profiles.id ON DELETE CASCADE; UNIQUE no MVP. |
| name | text | 2-100 caracteres. |
| slug | text | UNIQUE, lowercase, 3-50, regex de slug. |
| description | text | opcional, máximo 500. |
| phone | text | obrigatório, formato normalizado. |
| timezone | text | IANA, obrigatório; padrão definido no setup. |
| slot_interval_minutes | smallint | 15, 30 ou 60; padrão 30. |
| min_notice_minutes | integer | 0-10080; padrão 120. |
| booking_window_days | smallint | 1-180; padrão 60. |
| is_active | boolean | default true. |
| created_at/updated_at | timestamptz | timestamps de auditoria básica. |

### 8.4 Tabela services

| **Coluna** | **Tipo** | **Regra** |
| --- | --- | --- |
| id | uuid | PK. |
| business_id | uuid | FK businesses.id; NOT NULL. |
| name | text | 2-80 caracteres. |
| description | text | opcional, máximo 500. |
| duration_minutes | smallint | 5-480 minutos. |
| price_cents | integer | \>= 0; moeda do MVP = BRL. |
| is_active | boolean | default true; desativação em vez de exclusão quando houver histórico. |
| created_at/updated_at | timestamptz | timestamps. |

### 8.5 Tabela availability

| **Coluna** | **Tipo** | **Regra** |
| --- | --- | --- |
| id | uuid | PK. |
| business_id | uuid | FK businesses.id. |
| weekday | smallint | 1-7 (ISO 8601); padrão definido no código e documentado (1=segunda … 7=domingo). |
| start_time | time | hora local do negócio. |
| end_time | time | deve ser \> start_time; faixa não atravessa meia-noite. |
| is_active | boolean | default true. |

**Regra:** O mesmo dia pode possuir múltiplos intervalos, por exemplo 08:00-12:00 e 14:00-18:00. Intervalos da mesma agenda não devem se sobrepor.

### 8.6 Tabela availability_blocks

| **Coluna** | **Tipo** | **Regra** |
| --- | --- | --- |
| id | uuid | PK. |
| business_id | uuid | FK businesses.id. |
| start_at | timestamptz | início absoluto do bloqueio. |
| end_at | timestamptz | fim; \> start_at. |
| reason | text | opcional, máximo 120. |
| created_at | timestamptz | default now(). |

### 8.7 Tabela customers

| **Coluna** | **Tipo** | **Regra** |
| --- | --- | --- |
| id | uuid | PK. |
| business_id | uuid | FK businesses.id. |
| name | text | 2-100 caracteres. |
| phone | text | obrigatório e normalizado; UNIQUE com business_id. |
| email | text | opcional; validar formato quando informado. |
| created_at/updated_at | timestamptz | timestamps. |

**Deduplicação:** No MVP, clientes podem ser reutilizados por business_id + phone. Uma nova reserva pode atualizar nome/e-mail se o mesmo telefone já existir.

### 8.8 Tabela bookings

| **Coluna** | **Tipo** | **Regra** |
| --- | --- | --- |
| id | uuid | PK. |
| business_id | uuid | FK businesses.id. |
| service_id | uuid | FK services.id; preservado mesmo se serviço for desativado. |
| customer_id | uuid | FK customers.id. |
| customer_name_snapshot | text | nome do cliente no momento da reserva. |
| customer_phone_snapshot | text | telefone normalizado no momento da reserva. |
| customer_email_snapshot | text | e-mail opcional no momento da reserva. |
| service_name_snapshot | text | nome no momento da reserva. |
| duration_minutes_snapshot | smallint | duração no momento da reserva. |
| price_cents_snapshot | integer | preço no momento da reserva. |
| start_at | timestamptz | início em UTC. |
| end_at | timestamptz | fim em UTC; \> start_at. |
| status | booking_status | confirmed \| completed \| cancelled \| no_show. |
| public_code | uuid | UNIQUE; código aleatório para a tela pública de confirmação. |
| customer_note | text | opcional, máximo 500; não coletar dados sensíveis sem necessidade. |
| cancel_reason | text | opcional, máximo 250. |
| created_at/updated_at | timestamptz | timestamps. |

**Código público:** public_code deve ser UUID aleatório e não sequencial. A confirmação pública jamais usa booking.id como autorização e nunca retorna nome, telefone, e-mail ou observação do cliente.

### 8.9 Índices e constraints obrigatórios

- UNIQUE em businesses.slug e UNIQUE em businesses.owner_id no MVP.
- Índice em services(business_id, is_active).
- Índice em availability(business_id, weekday, is_active).
- Índice em availability_blocks(business_id, start_at, end_at).
- Índice em bookings(business_id, start_at).
- UNIQUE em customers(business_id, phone) após normalização do telefone.
- UNIQUE em bookings.public_code.
- Índice em bookings(customer_id, created_at desc).
- CHECK start_at \< end_at para bloqueios e reservas.
- CHECK price_cents \>= 0 e duration_minutes \> 0.
- Constraint de exclusão para impedir sobreposição de bookings não cancelados.

### 8.10 Proteção de concorrência no PostgreSQL

A migration deve criar primeiro o enum booking_status e habilitar btree_gist. Em seguida, deve criar uma exclusion constraint usando o intervalo \[start_at, end_at). A regra abaixo é conceitualmente obrigatória; os nomes podem variar na migration.

```sql
CREATE TYPE booking_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');
```

A aplicação deve então habilitar btree_gist e criar uma exclusion constraint usando o intervalo \[start_at, end_at). A regra abaixo é conceitualmente obrigatória; o nome pode variar na migration.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  business_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status <> 'cancelled');
```

**Por que é obrigatório:** Duas requisições simultâneas podem passar pela mesma checagem de disponibilidade. A constraint faz o banco rejeitar a segunda inserção que causar sobreposição.

## 9. Regras de negócio

### 9.1 Slug público

- Apenas letras minúsculas, números e hífen.
- Comprimento entre 3 e 50 caracteres.
- Sem hífen no início/fim e sem hífens consecutivos.
- UNIQUE no banco.
- Reservar: login, cadastro, dashboard, api, admin, suporte, termos, privacidade, pricing, precos, recursos, favicon, robots e sitemap.
- Alterar slug quebra o link anterior no MVP; mostrar aviso antes de salvar.

### 9.2 Serviços

- Preço zero é permitido para serviço gratuito; valores negativos são proibidos.
- Duração mínima 5 minutos e máxima 480 minutos.
- Serviço inativo não aparece na página pública e não aceita novas reservas.
- Desativar serviço não cancela reservas existentes.
- Alterar nome/preço/duração não altera reservas históricas por causa dos snapshots.

### 9.3 Disponibilidade recorrente

- Cada regra representa uma faixa de atendimento em hora local do negócio.
- É permitido ter mais de uma faixa por dia.
- Faixas do mesmo negócio e dia não podem se sobrepor.
- Uma faixa não pode atravessar meia-noite; dividir o período em dois dias quando necessário.
- Remover/alterar disponibilidade afeta apenas novos horários; reservas existentes permanecem válidas.

### 9.4 Bloqueios

- Bloqueio pode cobrir parte do dia, o dia inteiro ou vários dias.
- Bloqueio elimina candidatos de horário que tenham qualquer sobreposição.
- Criar bloqueio sobre uma reserva futura existente deve ser impedido e informar quais reservas conflitam.
- Excluir bloqueio volta a disponibilizar horários, respeitando reservas existentes e demais regras.

### 9.5 Timezone

- businesses.timezone usa identificador IANA, por exemplo America/Sao_Paulo.
- availability.start_time/end_time são horários locais; bookings e blocks são armazenados como timestamptz.
- O cálculo de slots ocorre no timezone do negócio antes da conversão para UTC.
- Mudar timezone com reservas futuras ativas deve ser bloqueado no MVP. O usuário deve cancelar/reagendar as reservas ou manter o timezone atual.

## 10. Algoritmo de disponibilidade

A função de disponibilidade é uma regra de domínio central e deve ser testável isoladamente. Ela recebe business, service e data local e retorna uma lista de inícios possíveis em ISO/timestamptz, além da representação local usada na interface.

### 10.1 Parâmetros

| **Parâmetro** | **Origem** | **Exemplo** |
| --- | --- | --- |
| timezone | businesses.timezone | America/Sao_Paulo |
| slotInterval | businesses.slot_interval_minutes | 30 |
| minNotice | businesses.min_notice_minutes | 120 |
| bookingWindow | businesses.booking_window_days | 60 |
| duration | services.duration_minutes | 45 |
| date | seleção do cliente | 2026-09-10 |

### 10.2 Passos normativos

1. Validar que o negócio e o serviço estão ativos.
2. Interpretar “agora” no timezone do negócio.
3. Validar que a data solicitada está dentro da janela futura permitida.
4. Carregar as faixas de availability do weekday correspondente.
5. Para cada faixa, gerar candidatos de início a partir de start_time usando slot_interval_minutes.
6. Para cada candidato, calcular candidateEnd = candidateStart + duração do serviço.
7. Descartar candidato cujo fim ultrapasse end_time da faixa.
8. Descartar candidato que viole min_notice_minutes.
9. Carregar availability_blocks que sobreponham a data/faixa e descartar candidatos conflitantes.
10. Carregar bookings status != cancelled que sobreponham o período e descartar candidatos conflitantes.
11. Ordenar os candidatos por horário e retornar apenas horários futuros e válidos.

### 10.3 Regra de sobreposição

Dois intervalos \[Astart, Aend) e \[Bstart, Bend) se sobrepõem quando Astart \< Bend e Aend \> Bstart. Usar intervalo semiaberto permite um atendimento terminar às 10:00 e o próximo começar exatamente às 10:00.

```text
overlap = candidateStart < existingEnd && candidateEnd > existingStart
```

### 10.4 Exemplo

```text
Disponibilidade: 08:00-12:00
slot_interval: 30 min
serviço: 45 min
reserva existente: 09:00-09:45

Candidatos brutos: 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00
Removidos por conflito: 08:30? NÃO (08:30-09:15 conflita, então SIM, remover)
09:00 -> remove
09:30 -> remove
Válidos: 08:00, 10:00, 10:30, 11:00
```

**Observação:** O intervalo de slots define quando um atendimento pode começar; ele não precisa ser igual à duração do serviço.

## 11. Ciclo de vida da reserva

### 11.1 Estados

| **Status** | **Significado** | **Ocupa agenda?** |
| --- | --- | --- |
| confirmed | Reserva criada com sucesso e horário garantido. | Sim |
| completed | Atendimento realizado. | Sim (histórico) |
| cancelled | Reserva cancelada. | Não |
| no_show | Cliente não compareceu. | Sim (histórico) |

### 11.2 Transições permitidas

```text
confirmed -> completed
confirmed -> cancelled
confirmed -> no_show

completed, cancelled e no_show são terminais no MVP.
```

### 11.3 Criação da reserva

1. Receber slug/business_id, service_id, start_at e dados do cliente.
2. Validar payload com Zod.
3. Carregar negócio e serviço e validar is_active.
4. Recalcular end_at usando a duração atual do serviço; nunca aceitar end_at vindo do cliente.
5. Revalidar janela, antecedência, disponibilidade recorrente e bloqueios.
6. Persistir customer + booking na mesma transação (recomendado via função/RPC PostgreSQL chamada apenas pelo servidor).
7. A transação faz upsert de customer por business_id + phone e insere booking com snapshots, public_code e status confirmed.
8. Se a constraint de overlap rejeitar, retornar erro de conflito e pedir ao cliente que escolha outro horário.
9. Retornar public_code e somente os dados necessários para a página de confirmação.

### 11.4 Persistência atômica

A criação de customer e booking deve ocorrer em uma única transação de banco. A forma recomendada é uma função PostgreSQL/RPC invocada somente pela camada server. Se a exclusion constraint detectar sobreposição, toda a transação deve ser revertida, evitando customer órfão criado por uma tentativa que não virou reserva.

- A função recebe IDs e dados já validados pelo servidor; não recebe preço, duração ou end_at confiáveis do browser.
- A função relê o serviço ativo, calcula end_at e grava snapshots.
- public_code é gerado no banco por gen_random_uuid().
- Qualquer erro de constraint faz rollback da transação.

### 11.5 Cancelamento

- Somente usuário proprietário do negócio cancela no MVP.
- Cancelamento exige confirmação na interface.
- cancel_reason é opcional.
- Após status cancelled, o intervalo pode voltar a aparecer na disponibilidade.
- Não apagar fisicamente a reserva.

## 12. Autenticação e autorização

### 12.1 Fluxos obrigatórios

- Cadastro com e-mail e senha.
- Confirmação de e-mail habilitada em produção.
- Login.
- Logout.
- Solicitação de recuperação de senha.
- Redefinição de senha por link seguro.
- Redirecionamento de usuário não autenticado ao tentar acessar /dashboard/\*.
- Redirecionamento de usuário autenticado para dashboard ao acessar login/cadastro, quando apropriado.

### 12.2 Senhas e sessão

- A aplicação não armazena senha em tabelas próprias; Supabase Auth é responsável pelo armazenamento e hash.
- Nunca registrar senha, token de sessão ou service-role key em logs.
- Cookies/sessões devem seguir a integração server-side suportada pelo Supabase/Next.js utilizada no projeto.

## 13. Segurança, RLS e privacidade

Segurança é requisito funcional do MVP. O critério mínimo é: um usuário autenticado não pode ler ou modificar dados privados de outro negócio, mesmo manipulando requests manualmente.

### 13.1 Matriz de acesso

| **Recurso** | **Público** | **Proprietário autenticado** |
| --- | --- | --- |
| Perfil público do negócio | Leitura limitada via camada server | Leitura/escrita do próprio negócio |
| Serviços ativos | Leitura limitada via camada server | CRUD lógico do próprio negócio |
| Disponibilidade | Resultado calculado; não expor dados desnecessários | CRUD do próprio negócio |
| Bloqueios | Não expor lista bruta | CRUD do próprio negócio |
| Bookings | Sem leitura direta; confirmação é mediada pelo servidor por public_code | Leitura e mudança de status do próprio negócio |
| Customers | Sem acesso | Leitura do próprio negócio |

### 13.2 Políticas RLS conceituais

```sql
profiles: id = auth.uid()

businesses: owner_id = auth.uid()

services / availability / availability_blocks / customers / bookings:
EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = <table>.business_id
    AND b.owner_id = auth.uid()
)
```

**Importante:** As políticas devem ser testadas tentando acessar dados de um segundo usuário. “A tela não mostra” não é evidência de segurança; o banco precisa negar.

### 13.3 Service role

- SUPABASE_SERVICE_ROLE_KEY é variável exclusivamente server-side.
- Nunca prefixar essa variável com NEXT_PUBLIC_.
- Nunca importar o cliente admin em componente Client.
- O fluxo público de reserva pode usar cliente admin no servidor, mas deve aplicar todas as regras e validações antes da escrita.

### 13.4 Dados pessoais e LGPD - baseline técnico

- Coletar somente dados necessários: nome, telefone/WhatsApp, e-mail opcional e observação opcional.
- Exibir aviso de privacidade/termos no fluxo público antes da confirmação.
- Não solicitar dados de saúde ou outros dados sensíveis como requisito genérico do MVP.
- Não expor dados de clientes em URLs, logs públicos ou respostas desnecessárias.
- Definir canal de contato para solicitação de exclusão/correção antes de uso comercial real.

**Nota:** Este documento define uma base técnica orientada à privacidade, mas não substitui revisão jurídica para operação comercial em setores regulados.

## 14. Validações de entrada

| **Campo** | **Regra server-side** |
| --- | --- |
| display_name | 2-80 caracteres; trim. |
| business.name | 2-100; trim. |
| slug | 3-50; lowercase; regex ^\[a-z0-9\]+(?:-\[a-z0-9\]+)\*$; não reservado. |
| description | 0-500 caracteres. |
| phone | obrigatório; normalizar; 8-20 caracteres úteis após limpeza. |
| email | opcional; formato de e-mail; lowercase/trim. |
| service.name | 2-80. |
| duration_minutes | inteiro 5-480. |
| price_cents | inteiro \>= 0. |
| slot_interval_minutes | somente 15, 30 ou 60. |
| min_notice_minutes | inteiro 0-10080. |
| booking_window_days | inteiro 1-180. |
| customer_note | 0-500. |
| cancel_reason | 0-250. |

### 14.1 Regras de mensagens

- Mensagens de validação devem ser compreensíveis e em português.
- Nunca devolver stack trace ou detalhes de SQL ao usuário.
- Conflito de horário deve retornar uma mensagem específica, não um “erro inesperado”.
- Falhas inesperadas devem receber um identificador de log/correlação no servidor quando possível.

## 15. Contratos de ações do servidor

Os nomes abaixo são referenciais; o comportamento é normativo. Cada ação deve retornar um resultado tipado de sucesso ou erro previsível.

| **Ação** | **Entrada essencial** | **Saída/erros** |
| --- | --- | --- |
| createBusiness | name, slug, phone, timezone, parâmetros | business \| VALIDATION \| SLUG_TAKEN \| BUSINESS_EXISTS |
| updateBusiness | campos editáveis | business \| VALIDATION \| TIMEZONE_LOCKED |
| createService | name, duration, price | service \| VALIDATION |
| updateService | serviceId + campos | service \| NOT_FOUND \| FORBIDDEN |
| deactivateService | serviceId | ok \| NOT_FOUND \| FORBIDDEN |
| setAvailability | weekday + intervalos | ok \| OVERLAP \| VALIDATION |
| createBlock | startAt, endAt, reason | block \| BOOKING_CONFLICT \| VALIDATION |
| deleteBlock | blockId | ok \| NOT_FOUND |
| getAvailableSlots | slug, serviceId, date | slots\[\] \| NOT_FOUND \| OUT_OF_WINDOW |
| createBooking | serviceId, startAt, customer data | booking \| SLOT_TAKEN \| VALIDATION |
| updateBookingStatus | bookingId, nextStatus | booking \| INVALID_TRANSITION \| FORBIDDEN |

### 15.1 Formato de resultado recomendado

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };
```

## 16. Páginas e rotas

| **Rota** | **Objetivo** | **Acesso** |
| --- | --- | --- |
| / | Landing page | Público |
| /login | Login do profissional | Público |
| /cadastro | Criação de conta | Público |
| /recuperar-senha | Solicitar recuperação | Público |
| /redefinir-senha | Definir nova senha | Link/token |
| /dashboard | Resumo e próximos horários | Autenticado |
| /dashboard/servicos | Serviços | Autenticado |
| /dashboard/agenda | Reservas | Autenticado |
| /dashboard/bloqueios | Bloqueios/exceções | Autenticado |
| /dashboard/configuracoes | Negócio, disponibilidade e parâmetros | Autenticado |
| /\[slug\] | Página pública de agendamento | Público |
| /\[slug\]/confirmacao?code=\<uuid\> | Confirmação da reserva por código público aleatório | Público; dados mínimos |

### 16.1 Regras da rota /\[slug\]

- Slug inexistente ou negócio inativo: 404.
- Mostrar somente serviços ativos.
- Datas/horários são obtidos dinamicamente; nunca deixar slots hardcoded.
- Ao trocar de serviço, recalcular disponibilidade porque a duração pode mudar.
- Não confiar em price/duration enviados pelo cliente na confirmação.
- A confirmação usa bookings.public_code; a camada server retorna apenas serviço, data/hora e contato do negócio, nunca dados do cliente.

## 17. Requisitos de UX, responsividade e acessibilidade

- Mobile-first; fluxo público deve ser confortável a partir de ~320 px de largura.
- Alvos de toque adequados e botões principais visíveis sem ambiguidade.
- Formulários com label associado, mensagens de erro e foco no primeiro erro quando possível.
- Navegação por teclado em componentes essenciais.
- Contraste de texto e estados visuais suficiente; não depender apenas de cor para status.
- Loading não deve permitir duplo clique que gere mutação duplicada.
- Botão de confirmar reserva fica desabilitado durante submissão.
- Datas e preços devem usar formatação local pt-BR no MVP.

### 17.1 Dashboard - conteúdo mínimo

- Card com reservas de hoje.
- Lista de próximos agendamentos ordenada por start_at.
- Acesso rápido a “Novo serviço”, “Configurar horários” e “Bloquear período”.
- Agenda com filtros por data e status.
- Detalhe da reserva com cliente, contato, serviço, preço snapshot, data/hora e ações de status.

## 18. Tratamento de erros e observabilidade

| **Situação** | **Resposta ao usuário** | **Ação técnica** |
| --- | --- | --- |
| Slot ocupado na concorrência | “Esse horário acabou de ser reservado. Escolha outro.” | Mapear violation da exclusion constraint para SLOT_TAKEN. |
| Slug duplicado | “Este endereço já está em uso.” | Mapear unique violation. |
| Sessão ausente | Redirecionar para login. | Não executar mutação. |
| Permissão negada | “Você não tem permissão para esta ação.” | Registrar contexto sem dados sensíveis. |
| Erro inesperado | “Não foi possível concluir agora. Tente novamente.” | Log server-side com stack e request context seguro. |

- Não registrar service-role key, access token, refresh token ou senha.
- Reduzir exposição de telefone/e-mail em logs; mascarar quando possível.
- Falhas de banco previsíveis devem ser convertidas em códigos de domínio.

## 19. Estratégia de testes

### 19.1 Testes unitários

- Geração de slots com diferentes durações e intervalos.
- Sobreposição de intervalos.
- Aplicação de min_notice e booking_window.
- Subtração de bloqueios.
- Transições de status.
- Schemas Zod de negócio, serviço e reserva.

### 19.2 Testes de integração

- Criar reserva válida no banco.
- Duas reservas simultâneas sobrepostas: apenas uma deve persistir.
- Reserva cancelada libera horário.
- Service snapshots permanecem após alteração do serviço.
- RLS: usuário A não lê/escreve negócio de usuário B.
- Bloqueio em conflito com reserva futura é recusado.

### 19.3 Testes E2E mínimos

1. Cadastrar usuário e concluir setup.
2. Criar serviço.
3. Configurar disponibilidade.
4. Abrir página pública em sessão anônima.
5. Criar reserva.
6. Confirmar que reserva aparece no dashboard.
7. Cancelar reserva e confirmar reaparecimento do slot.
8. Criar bloqueio e confirmar remoção do slot público.
9. Testar layout principal em viewport móvel e desktop.

## 20. Configuração de ambiente e deploy

### 20.1 Variáveis de ambiente

| **Variável** | **Exposição** | **Uso** |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Client/Server | URL do projeto Supabase. |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client/Server | Chave pública/anon para sessão e operações sob RLS. |
| SUPABASE_SERVICE_ROLE_KEY | Somente Server | Operações públicas controladas e administração necessária. |
| NEXT_PUBLIC_APP_URL | Client/Server | URL base para redirects e links. |

**Bloqueador de release:** Se SUPABASE_SERVICE_ROLE_KEY aparecer no bundle do navegador, em variável NEXT_PUBLIC_, em repositório Git ou em logs públicos, o deploy deve ser considerado inseguro e não pode ser publicado.

### 20.2 Ambientes

- Local: .env.local não versionado.
- Preview: projeto/ambiente de teste com dados não produtivos.
- Production: variáveis protegidas e migrations aplicadas antes do tráfego real.
- Seeds de demonstração nunca devem conter dados pessoais reais.

### 20.3 Checklist de deploy

| **OK** | **Critério** |
| --- | --- |
| ☐ | Migrations aplicadas em ordem e reproduzíveis do zero. |
| ☐ | RLS habilitada nas tabelas privadas. |
| ☐ | Exclusion constraint de bookings criada. |
| ☐ | Variáveis configuradas na Vercel sem exposição indevida. |
| ☐ | Domínios/redirect URLs do Supabase Auth configurados. |
| ☐ | Build, lint e typecheck sem erros. |
| ☐ | Testes automatizados críticos aprovados. |
| ☐ | Fluxo de cadastro/login/recuperação testado em produção. |
| ☐ | Fluxo público de reserva testado em produção. |
| ☐ | README atualizado com setup e arquitetura. |

### 20.4 Ordem das migrations

1. Habilitar extensões necessárias e criar enum booking_status.
2. Criar profiles e businesses.
3. Criar services, availability, availability_blocks, customers e bookings.
4. Criar UNIQUE/CHECK/índices e exclusion constraint.
5. Criar função transacional de persistência da reserva e trigger de updated_at, se utilizado.
6. Habilitar RLS e criar policies.
7. Aplicar seed somente em desenvolvimento/preview.

## 21. Roteiro de desenvolvimento

| **Fase** | **Entregável** | **Saída verificável** |
| --- | --- | --- |
| 1. Fundação | Next.js, Tailwind, shadcn/ui, lint, estrutura e Git | App inicia, build passa e design tokens existem. |
| 2. Landing | Navbar, hero, benefícios, demonstração, planos, FAQ e footer | Landing responsiva e navegável. |
| 3. Banco/Auth | Supabase, migrations, schema, Auth, RLS | Cadastro/login e isolamento testado. |
| 4. Dashboard base | Layout protegido, setup do negócio e serviços | Usuário configura perfil e serviço. |
| 5. Agenda | Disponibilidade recorrente e bloqueios | Algoritmo retorna slots válidos. |
| 6. Agendamento público | /\[slug\], seleção e createBooking | Cliente reserva sem login. |
| 7. Gestão | Lista, detalhe e estados da reserva | Dashboard reflete e altera status. |
| 8. Qualidade | Loading, erros, a11y, testes, responsividade | Critérios de aceite aprovados. |
| 9. Deploy | Vercel, env, README, smoke test | MVP publicado e reproduzível. |

## 22. Critérios de aceite por funcionalidade

### 22.1 Autenticação

| **OK** | **Critério** |
| --- | --- |
| ☐ | Usuário consegue cadastrar e autenticar com credenciais válidas. |
| ☐ | Credenciais inválidas exibem erro sem revelar detalhes sensíveis. |
| ☐ | Rota /dashboard bloqueia usuário anônimo. |
| ☐ | Logout encerra a sessão e impede acesso ao dashboard. |
| ☐ | Recuperação e redefinição de senha funcionam com URL de produção. |

### 22.2 Serviços

| **OK** | **Critério** |
| --- | --- |
| ☐ | Criar serviço válido persiste preço em centavos e duração em minutos. |
| ☐ | Serviço inativo deixa de aparecer na página pública. |
| ☐ | Alterar serviço não modifica snapshots de reservas existentes. |
| ☐ | Usuário não consegue editar serviço de outro negócio. |

### 22.3 Disponibilidade e bloqueios

| **OK** | **Critério** |
| --- | --- |
| ☐ | Múltiplas faixas no mesmo dia funcionam sem sobreposição. |
| ☐ | Slots respeitam duração, intervalo, antecedência e janela futura. |
| ☐ | Bloqueio remove slots que se sobrepõem ao período. |
| ☐ | Não é possível criar bloqueio que colida com reserva futura ativa sem resolver o conflito. |

### 22.4 Reservas

| **OK** | **Critério** |
| --- | --- |
| ☐ | Cliente anônimo consegue reservar um slot válido. |
| ☐ | O servidor recalcula duração/preço e não confia em valores do browser. |
| ☐ | Duas tentativas simultâneas sobrepostas não geram dupla reserva. |
| ☐ | Falha de conflito faz rollback de customer + booking. |
| ☐ | Tela de confirmação funciona por public_code sem expor dados pessoais do cliente. |
| ☐ | Reserva aparece imediatamente no dashboard. |
| ☐ | Cancelamento libera o slot para nova reserva. |
| ☐ | Completed/no_show permanecem no histórico. |

### 22.5 Segurança

| **OK** | **Critério** |
| --- | --- |
| ☐ | Usuário A não lê, altera nem exclui dados de usuário B via requests manuais. |
| ☐ | Dados de customers e bookings não possuem leitura pública. |
| ☐ | Service-role key não aparece no bundle cliente. |
| ☐ | Inputs inválidos são rejeitados no servidor mesmo se a validação do browser for removida. |

## 23. Definition of Done do MVP

O MVP só pode ser marcado como concluído quando todos os itens abaixo forem verdadeiros. Itens visuais isolados ou funcionamento apenas em ambiente local não são suficientes.

| **OK** | **Critério** |
| --- | --- |
| ☐ | Profissional cria conta, autentica e recupera senha. |
| ☐ | Profissional configura nome, slug, contato, timezone e regras da agenda. |
| ☐ | Profissional cadastra pelo menos um serviço. |
| ☐ | Profissional define disponibilidade recorrente e bloqueios. |
| ☐ | Página pública exibe somente serviços e slots válidos. |
| ☐ | Cliente conclui reserva sem criar conta. |
| ☐ | Reserva é protegida contra corrida/sobreposição no banco. |
| ☐ | Persistência de customer + booking é atômica e reverte em caso de conflito. |
| ☐ | Reserva aparece no dashboard imediatamente. |
| ☐ | Profissional cancela, conclui ou marca no-show. |
| ☐ | Nenhum usuário acessa dados privados de outro negócio. |
| ☐ | Interface principal funciona em celular e desktop. |
| ☐ | Estados de loading, empty, validation e error foram implementados. |
| ☐ | Testes unitários do algoritmo de disponibilidade passam. |
| ☐ | Testes de integração de concorrência e RLS passam. |
| ☐ | Principais fluxos E2E passam. |
| ☐ | Aplicação está publicada na Vercel. |
| ☐ | README explica arquitetura, setup local, migrations, env e execução de testes. |

## 24. Evoluções pós-MVP

- Lembretes automáticos por e-mail ou WhatsApp.
- Pagamento antecipado ou sinal.
- Planos de assinatura e billing.
- Equipe com múltiplos profissionais e agendas independentes.
- Feriados automáticos por calendário externo; o MVP já possui bloqueios manuais.
- Relatórios de faturamento, serviços mais vendidos, cancelamentos e no-show.
- Cupons e campanhas.
- Lista de espera.
- Integração com Google Calendar.
- Cancelamento/reagendamento pelo cliente com token seguro.
- PWA ou aplicativo móvel.

### 24.1 Preparação para equipe

A separação entre profiles e businesses evita acoplar definitivamente um negócio a dados de autenticação. Ao implementar equipe, a evolução recomendada é criar business_members e professionals/resources, e mover a constraint de sobreposição de business_id para professional_id/resource_id.

## 25. Por que o projeto é forte para portfólio

| **Competência** | **Evidência no Agendify** |
| --- | --- |
| Frontend | React, componentes reutilizáveis, formulários, estados e responsividade. |
| Backend | Server Actions/Route Handlers, regras de domínio e tratamento de erros. |
| Banco | Modelagem relacional, índices, constraints e concorrência. |
| Segurança | Auth, RLS, isolamento de tenant e segredo server-only. |
| Produto | MVP, persona, jornada, regras e critérios de aceite. |
| Qualidade | Testes unitários, integração e E2E. |
| DevOps | Git, migrations, variáveis e deploy na Vercel. |

## 26. Estrutura mínima do README

1. Visão geral e screenshot do produto.
2. Problema resolvido e escopo do MVP.
3. Stack tecnológica.
4. Arquitetura e fluxo de dados.
5. Modelo de banco e migrations.
6. Como configurar Supabase.
7. Variáveis de ambiente sem valores secretos.
8. Como executar localmente.
9. Como executar testes, lint e typecheck.
10. Principais decisões técnicas: timezone, snapshots, RLS e exclusion constraint.
11. Link do deploy e credenciais de demonstração, se aplicável.

## 27. Ordem prática para começar a programar

1. Criar repositório e aplicação Next.js com TypeScript, Tailwind e componentes base.
2. Implementar design system e landing page.
3. Criar projeto Supabase e migrations do schema canônico.
4. Criar constraints, índices, enum booking_status e RLS antes das telas CRUD.
5. Implementar Auth e proteção do dashboard.
6. Implementar setup do business e services.
7. Implementar availability e blocks.
8. Escrever e testar o algoritmo getAvailableSlots isoladamente.
9. Implementar página /\[slug\].
10. Implementar createBooking com revalidação server-side e tratamento de SLOT_TAKEN.
11. Implementar gestão de bookings no dashboard.
12. Adicionar estados de UI, acessibilidade e testes E2E.
13. Fazer deploy e executar checklist de release.

**Próximo passo recomendado:** Começar pela Fase 1 e landing page, mas criar as migrations canônicas antes de implementar qualquer regra real de agenda. Isso evita que a interface dite um banco improvisado.

## 28. Registro de decisões do MVP

| **ID** | **Decisão** | **Motivo** |
| --- | --- | --- |
| D-001 | Reserva nasce confirmed. | Fluxo simples e instantâneo; aprovação manual fica fora do MVP. |
| D-002 | Confirmação por tela, sem mensagem automática. | Evita prometer integração não implementada. |
| D-003 | Bloqueios entram no MVP. | Agenda real precisa de exceções sem alterar horário recorrente. |
| D-004 | Slots padrão de 30 minutos. | Permite durações diferentes sem amarrar início à duração. |
| D-005 | UTC no banco + timezone IANA do negócio. | Evita inconsistências de data/hora. |
| D-006 | Exclusion constraint para bookings. | Evita dupla reserva sob concorrência. |
| D-007 | Snapshots em bookings. | Preserva histórico após alteração do serviço. |
| D-008 | Serviços são desativados, não apagados com histórico. | Mantém integridade referencial. |
| D-009 | Público não lê customers/bookings. | Minimização de exposição de dados pessoais. |
| D-010 | Service role somente no servidor. | Evita comprometimento completo do banco via cliente. |
| D-011 | Customer + booking são persistidos em transação. | Evita registros parciais quando a reserva falha. |
| D-012 | Confirmação usa public_code aleatório. | Permite refresh da confirmação sem abrir leitura pública de bookings. |

## 29. Estado final da especificação

Com as decisões e critérios desta versão, o Agendify possui definição suficiente para iniciar e concluir o MVP sem depender de decisões fundamentais improvisadas no meio do desenvolvimento. Banco, concorrência, timezone, lifecycle de reserva, autenticação, RLS, validações, UX mínima, testes e deploy possuem comportamento explicitamente definido.

**Fonte de verdade:** Em caso de conflito entre um mockup futuro e as regras deste documento, prevalece esta especificação até que uma decisão seja registrada e a versão do documento seja atualizada.

Agendify - conceito de produto para estudo, portfólio e evolução responsável para um SaaS real.

<!-- Rodapé repetido no DOCX: Agendify  •  Documento de produto e implementação  •  Página [PAGE] -->
