import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database-types";

type Client = SupabaseClient<Database>;

// Shared guard used by the availability/block server actions: a professional must
// exist, belong to the business and be active before a faixa/bloqueio is attached
// to it. Single `.single()` means a foreign, missing or deactivated professional
// all collapse to `null` here, and the caller surfaces one friendly error.
export async function getActiveProfessional(
  client: Client,
  businessId: string,
  professionalId: string,
): Promise<{ id: string } | null> {
  const { data } = await client
    .from("professionals")
    .select("id, business_id, is_active")
    .eq("id", professionalId)
    .eq("business_id", businessId)
    .single();

  if (!data || !data.is_active) return null;
  return data;
}
