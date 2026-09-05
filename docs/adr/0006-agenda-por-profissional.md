# Agenda por profissional (equipe como recursos do negócio)

> **Status: REVERTIDO (superseded).** Removido em favor de um agendamento único em nível de negócio (migração `20260914000000_remove_team_and_plan.sql`). O modelo de `professionals` e a agenda por `professional_id` foram retirados; disponibilidade, bloqueios e reservas são escopados por `business_id` apenas.

A equipe é modelada como `professionals` — recursos gerenciados pelo dono, sem conta própria — e a agenda passa a ser por profissional: `availability.professional_id` substitui `business_id`, e a exclusion constraint anti-sobreposição migra de `(business_id, ...)` para `(professional_id, ...)`.

Serviços permanecem no `business_id` (catálogo do negócio, preço único; todo profissional ativo pode atender). A migração cria um profissional padrão por negócio, semeado do `display_name` do dono, e associa a disponibilidade/reservas pré-existentes a ele.

A agenda por profissional (`professional_id`, não `business_id`) é o que destrava capacidade multi-funcionário real e antecipa a spec §24.1. Alternativas — agenda única do negócio, catálogo por profissional, profissionais como contas com login — foram descartadas: agenda única não dá capacidade multi-staff; catálogo por profissional acopla o catálogo à equipe; e login de staff adia-se (profissionais são recursos no MVP). Difícil de reverter depois que há dados e a constraint migrada.
