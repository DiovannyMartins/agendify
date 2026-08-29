# Confirmação pública por public_code aleatório

A tela de confirmação de reserva é acessada por `public_code` (UUID aleatório), nunca pelo `booking.id` ou por qualquer dado que exponha o cliente. A camada server retorna apenas serviço, data/hora e contato do negócio.

Permitir acesso por `id` sequencial exporia reservas e dados pessoais de qualquer pessoa. A reversão exigiria redesenhar a autorização da confirmação, que é um ponto sensível de privacidade (LGPD).
