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

// Sign in using the anon-key client and return a session-scoped client used to
// exercise RLS as a real authenticated user.
export async function anonClientForUser(email: string, password: string) {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
