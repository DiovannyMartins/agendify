# Exclusion constraint para impedir sobreposição de reservas

Sobreposições de reservas ativas são impedidas no PostgreSQL por uma constraint `EXCLUDE USING gist` sobre `(business_id, tstzrange(start_at, end_at, '[)'))`, filtrando `status <> 'cancelled'`.

Duas requisições simultâneas podem passar pela mesma checagem de disponibilidade no servidor; só o banco consegue rejeitar a segunda inserção de forma atômica. Alternativas (apenas validação server-side, serialização de transações) são mais frágeis ou mais complexas. Muito difícil de reverter depois que os dados existem.
