# Renomeação Agendify → AgendFined

O produto operava como Agendify em `CONTEXT.md`, código, URLs e marcas. Decidimos adotar AgendFined como nome canônico único (Title Case com F maiúsculo, sem espaço; slug `agendfined` onde hífen/espaço não são permitidos).

Mantivemos o modelo de domínio inalterado; apenas a marca muda. A reversão é cara porque o nome antigo aparece em ~76 pontos (package.json, layout/metadata, marketing, e-mails de teste, PRODID do .ics, scripts e docs), então a troca no código será feita como tarefa de implementação separada.
