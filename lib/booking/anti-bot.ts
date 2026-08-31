// Optional Cloudflare Turnstile anti-bot gate (§17). The token is validated
// server-side against the Turnstile API; the siteverify secret never reaches the
// browser. Failure is fail-closed whenever TURNSTILE_SECRET_KEY is configured.
// When the secret is not configured the feature is disabled (fail-open) so the
// booking flow keeps working until the key is added to the server environment.
export async function verifyTurnstile(token?: string): Promise<{ ok: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };

  if (!token) return { ok: false };

  const body = new URLSearchParams({ secret, response: token });

  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
  } catch {
    // Provider unreachable: fail closed.
    return { ok: false };
  }

  if (!response.ok) return { ok: false };

  const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  return { ok: data.success === true };
}
