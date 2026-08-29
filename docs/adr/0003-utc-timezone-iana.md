# UTC no banco + timezone IANA por negócio

Datas são armazenadas como `timestamptz` (UTC) e exibidas no fuso IANA do negócio (`businesses.timezone`). A disponibilidade recorrente usa hora local do negócio e é convertida para UTC no cálculo de slots.

Guardar em fuso local do servidor ou em um único fuso fixo geraria inconsistências entre clientes de regiões diferentes. O timezone é gravado por negócio, então trocá-lo com reservas futuras ativas é bloqueado. Reversão é cara: afeta todos os dados temporais já persistidos.
