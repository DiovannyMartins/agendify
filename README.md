# Agendify

Plataforma SaaS de agendamento online para profissionais e pequenos negócios. O profissional configura seu negócio, serviços e disponibilidade; clientes reservam serviços pela página pública, sem precisar de conta.

## Visão geral

O Agendify gera uma página pública por slug (`/[slug]`). O cliente escolhe serviço, data e horário; o servidor revalida a disponibilidade e cria a reserva de forma atômica. O profissional acompanha tudo no dashboard.

> Especificação de produto e implementação: `documento-projeto.md` (fonte de verdade do MVP).

## Stack

| Tecnologia | Uso |
| --- | --- |
| Next.js 16 (App Router) + React 19 + TypeScript | Aplicação, rotas, Server Actions |
| Tailwind CSS 4 | Estilos responsivos |
| shadcn/ui + Lucide | Componentes de interface e ícones |
| React Hook Form + Zod | Formulários e validação compartilhada |
| Supabase Auth | Autenticação do profissional |
| Supabase PostgreSQL | Persistência, constraints, RLS, RPCs |
| Vitest + Playwright | Testes unitários, integração e E2E |
| Vercel | Deploy e hospedagem |

## Arquitetura e fluxo de dados

```text
Navegador -> Next.js (UI)
              -> Server Action / Route Handler
                 -> Zod + regras de domínio
                    -> Supabase PostgreSQL / Auth
                       -> RLS + constraints + transação
```

- A interface nunca é a fonte final de verdade para disponibilidade.
- Toda mutação relevante é validada no servidor com Zod e regras de domínio.
- A criação da reserva é protegida no banco contra sobreposição (exclusion constraint), mesmo sob concorrência.
- A service role key existe apenas no servidor e nunca é exposta ao navegador.
- O fluxo público de reserva usa uma RPC (`create_booking`) server-only, que grava customer + booking atomicamente.
- A confirmação pública é mediada por `public_code`, nunca por dados do cliente.

## Modelo de banco e migrations

As migrations vivem em `supabase/migrations/` e são versionadas na ordem da spec (§20.4):

1. **0001** extensões (`btree_gist`, `pgcrypto`) + enum `booking_status`
2. **0002** `profiles` e `businesses`
3. **0003** `services`, `availability`, `availability_blocks`, `customers`, `bookings`
4. **0004** índices, CHECKs, UNIQUEs e a **exclusion constraint** anti-sobreposição
5. **0005** triggers de `updated_at` + RPC transacional `create_booking`
6. **0006** RLS e policies (§13.2)
7. **0007** função pública de consulta por `public_code`

Aplicar no Supabase:

```bash
supabase db push --db-url "postgresql://postgres.<ref>:<senha>@<host>.pooler.supabase.com:6543/postgres"
```

Gerar os tipos tipados:

```bash
supabase gen types typescript --db-url "<db-url>" --schema public > lib/supabase/database-types.ts
```

## Como configurar o Supabase

1. Crie um projeto no [Supabase](https://supabase.com/dashboard).
2. Em **Project Settings → API**, copie a URL e as chaves `sb_publishable_...` e `sb_secret_...`.
3. Em **Authentication → Sign In / Up → Email**, habilite/desabilite "Confirm email" conforme o ambiente.
4. Em **Authentication → URL Configuration**, defina Site URL (`http://localhost:3000` em dev) e adicione as Redirect URLs (`http://localhost:3000/**`, `http://localhost:3000/auth/callback`).

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Exposição | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/Server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client/Server | Chave publishable (`sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente Server | Operações públicas controladas (`sb_secret_...`) |
| `NEXT_PUBLIC_APP_URL` | Client/Server | URL base para redirects |

> A service role **nunca** deve aparecer no bundle do navegador, em variável `NEXT_PUBLIC_`, no repositório Git ou em logs públicos.

## Como executar localmente

```bash
npm install
npm run dev        # http://localhost:3000
```

Requer **Node 22+** (ver `.nvmrc`/`.node-version` e `engines`).

## Testes, lint e typecheck

```bash
npm run test        # unitários + integração (Vitest)
npm run test:e2e    # E2E (Playwright, chromium + mobile)
npm run lint
npm run typecheck
```

- **Unitários** (`lib/**`) : algoritmo de disponibilidade, Zod schemas, transições de status.
- **Integração**: concorrência de reservas, RLS, snapshots, bloqueio vs reserva.
- **E2E**: fluxo público de reserva e redirecionamentos de auth.

## Principais decisões técnicas

- **Timezone IANA por negócio**: datas gravadas em UTC, exibidas no fuso do negócio.
- **Snapshots de reserva**: nome/preço/duração do serviço são copiados no momento da reserva; alterações futuras não mudam o histórico.
- **Exclusion constraint** em `bookings` para impedir sobreposição sob concorrência.
- **Service role server-only** no fluxo público, com validação estrita antes da escrita.
- **Desativação em vez de exclusão** de serviços com histórico.

## Deploy

Ver documentação da [Vercel](https://vercel.com/docs). Configure as variáveis de ambiente na Vercel (sem a service role no bundle) e adicione a URL de produção na config do Supabase.

## Estado

MVP completo (Fases 1–9 da spec). 

## Produção

- **URL**: https://agendify-liart.vercel.app
- **Supabase**: projeto `wgmmrpvrtgsxwdhtgfjy` (produção)
