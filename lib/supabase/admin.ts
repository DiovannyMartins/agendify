import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. Never exported to the browser and never prefixed with NEXT_PUBLIC_.
// Used only by the server for the public booking flow and privileged operations.
export function createAdminClient() {
  if (process.env.NODE_ENV === "production" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production (server-only).");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
