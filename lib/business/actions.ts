"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { businessSchema } from "@/lib/validation/schemas";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };

// §9.1 reserved slugs. Kept module-internal (not exported) because a "use server"
// file may only export async functions.
const RESERVED_SLUGS = [
  "login",
  "cadastro",
  "dashboard",
  "api",
  "admin",
  "suporte",
  "termos",
  "privacidade",
  "pricing",
  "precos",
  "recursos",
  "favicon",
  "robots",
  "sitemap",
];

type BusinessPayload = {
  id?: string;
  name: string;
  slug: string;
  phone: string;
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  bookingWindowDays: number;
  description?: string | null;
};

export async function upsertBusiness(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const payload: BusinessPayload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    slotIntervalMinutes: Number(formData.get("slotIntervalMinutes") ?? 30),
    minNoticeMinutes: Number(formData.get("minNoticeMinutes") ?? 120),
    bookingWindowDays: Number(formData.get("bookingWindowDays") ?? 60),
    description: String(formData.get("description") ?? "") || null,
  };

  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (RESERVED_SLUGS.includes(parsed.data.slug)) {
    return {
      ok: false,
      code: "SLUG_RESERVED",
      message: "Este endereço está reservado. Escolha outro slug.",
      fieldErrors: { slug: ["Slug reservado."] },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED", message: "Faça login para continuar." };

  // Timezone lock (§9.5): block changing timezone with future bookings.
  const existing = await supabase
    .from("businesses")
    .select("id, timezone, created_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing.data && existing.data.timezone !== parsed.data.timezone) {
    const { data: futureBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", existing.data.id)
      .gt("start_at", new Date().toISOString())
      .neq("status", "cancelled");
    const count = (futureBookings as unknown as { length?: number })?.length ?? 0;
    if (count > 0) {
      return {
        ok: false,
        code: "TIMEZONE_LOCKED",
        message: "Não é possível mudar o fuso com reservas futuras ativas. Cancele/reagende ou mantenha o fuso atual.",
        fieldErrors: { timezone: ["Bloqueado com reservas futuras ativas."] },
      };
    }
  }

  if (existing.data?.id) {
    const { error } = await supabase
      .from("businesses")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        phone: parsed.data.phone,
        timezone: parsed.data.timezone,
        slot_interval_minutes: parsed.data.slotIntervalMinutes,
        min_notice_minutes: parsed.data.minNoticeMinutes,
        booking_window_days: parsed.data.bookingWindowDays,
        description: parsed.data.description ?? null,
      })
      .eq("id", existing.data.id)
      .eq("owner_id", user.id);

    if (error) return mapDbError(error);
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  }

  // Create business (must also create a profile row if absent for owner_id FK).
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: parsed.data.name }, { onConflict: "id" });
  if (profileError) return mapDbError(profileError);

  const { error } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      phone: parsed.data.phone,
      timezone: parsed.data.timezone,
      slot_interval_minutes: parsed.data.slotIntervalMinutes,
      min_notice_minutes: parsed.data.minNoticeMinutes,
      booking_window_days: parsed.data.bookingWindowDays,
      description: parsed.data.description ?? null,
    });

  if (error) return mapDbError(error);
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

function mapDbError(error: { code?: string; message: string }): ActionResult {
  if (error.code === "23505") {
    return { ok: false, code: "SLUG_TAKEN", message: "Este endereço já está em uso." };
  }
  return { ok: false, code: "DB_ERROR", message: "Não foi possível salvar. Tente novamente." };
}
