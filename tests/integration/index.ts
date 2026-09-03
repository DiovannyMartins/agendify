import { loadEnvFile } from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database-types";

loadEnvFile(".env.local");

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export const SUPABASE_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Retry a business upsert/insert on the transient `businesses_owner_id_fkey` FK
// race (23503) that can appear when integration files run against the shared
// remote project. Production constraints are untouched.
export async function retryOnFk<T>(fn: () => Promise<T>, attempts = 6, delayMs = 250): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String((e as { message?: unknown })?.message ?? e);
      if (!/businesses_owner_id_fkey|23503/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// A publishable-key client with no session, used to exercise RLS/ACL as the
// anonymous (anon) role.
export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE);
}

// Sign in using the anon-key client and return a session-scoped client used to
// exercise RLS as a real authenticated user.
export async function anonClientForUser(email: string, password: string) {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
