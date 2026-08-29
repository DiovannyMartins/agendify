# Service role restrito ao servidor no fluxo público de reserva

O fluxo público de reserva usa o cliente admin (service-role) apenas no servidor, sempre revalidando regras antes de escrever. A chave `SUPABASE_SERVICE_ROLE_KEY` é exclusivamente server-side.

Clientes anônimos não têm sessão para escrever via RLS, então o fluxo público precisa de credencial privilegiada. Expor a service-role ao navegador comprometeria todo o banco. Reversão é cara: exigiria redesenhar a autenticação do fluxo público.
