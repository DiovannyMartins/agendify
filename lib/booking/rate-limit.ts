import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database-types";

export type ServerClient = SupabaseClient<Database>;

// Protection against reservation flooding (§15/§16). The limiter is keyed on
// IP + business and on a business-wide aggregate, so it never relies only on an
// attacker-controlled phone number. It is hosted in Postgres (durable, shared
// across serverless instances, no new infra) behind a service_role-only RPC.
export const RATE_LIMIT = {
  perIpPerBusiness: { limit: 8, windowSeconds: 60 * 15 },
  perBusiness: { limit: 60, windowSeconds: 60 * 15 },
} as const;

// Public consultation (§16) is an anonymous, unguessable-code lookup. Keep it
// separate from the reservation counters so a flood of lookups can't starve a
// real customer's ability to book.
export const CONSULT_RATE_LIMIT = {
  perIp: { limit: 12, windowSeconds: 60 * 15 },
} as const;

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const xri = h.get("x-real-ip");
  return xff?.split(",")[0]?.trim() || xri?.trim() || "unknown";
}

export function buildRateKeys(ip: string, businessId: string) {
  return [
    { key: `ip:${ip}|business:${businessId}`, ...RATE_LIMIT.perIpPerBusiness },
    { key: `business:${businessId}`, ...RATE_LIMIT.perBusiness },
  ] as const;
}

// Returns true when the attempt is still within limits for every window.
export async function enforceRateLimit(
  supabase: ServerClient,
  ip: string,
  businessId: string,
): Promise<boolean> {
  for (const { key, limit, windowSeconds } of buildRateKeys(ip, businessId)) {
    const { data, error } = await supabase.rpc("check_booking_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    if (data === false) return false;
  }
  return true;
}

// Consultation is keyed only on the client IP (no business scope — the caller is
// anonymous and the code is what matters). Returns true when within limits.
export async function enforceConsultRateLimit(
  supabase: ServerClient,
  ip: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_booking_rate_limit", {
    p_key: `ip:${ip}|consult`,
    p_limit: CONSULT_RATE_LIMIT.perIp.limit,
    p_window_seconds: CONSULT_RATE_LIMIT.perIp.windowSeconds,
  });
  if (error) throw error;
  return data === true;
}
