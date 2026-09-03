"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { professionalSchema } from "@/lib/validation/schemas";
import { getCurrentBusiness } from "@/lib/business/queries";
import { canAddProfessional, getProfessionalLimit } from "@/lib/team/plan";
import type { ActionResult } from "@/lib/business/actions";

export type { ActionResult };

function limitMessage(plan: Parameters<typeof getProfessionalLimit>[0]): string {
  const limit = getProfessionalLimit(plan);
  return `Seu plano atual permite até ${limit} profissional${limit === 1 ? "" : "s"} ativo${limit === 1 ? "" : "s"}. Faça upgrade para ampliar a equipe.`;
}

export async function createProfessional(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = professionalSchema.safeParse({
    name: String(formData.get("name") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const business = await getCurrentBusiness();
  if (!business) return { ok: false, code: "NO_BUSINESS", message: "Configure seu negócio primeiro." };

  const supabase = await createClient();
  const { count: activeCount } = await supabase
    .from("professionals")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("is_active", true);

  // Server-side gate (ADR 0007): the limit is not a client concern. The DB
  // trigger (see migrations) is the hard guarantee; this check gives the owner a
  // specific, friendly error before the DB rejects the insert.
  if (!canAddProfessional(activeCount ?? 0, business.plan)) {
    return { ok: false, code: "PROFESSIONAL_LIMIT", message: limitMessage(business.plan) };
  }

  const { error } = await supabase.from("professionals").insert({
    business_id: business.id,
    name: parsed.data.name,
  });

  if (error) {
    return {
      ok: false,
      code: /PLAN_LIMIT|PROFESSIONAL_LIMIT/i.test(String(error.message)) ? "PROFESSIONAL_LIMIT" : "DB_ERROR",
      message: /PLAN_LIMIT|PROFESSIONAL_LIMIT/i.test(String(error.message))
        ? limitMessage(business.plan)
        : "Não foi possível salvar o profissional.",
    };
  }

  revalidatePath("/dashboard/equipe");
  return { ok: true, data: undefined };
}

// Deactivate (always allowed) or reactivate (gated by plan limit). A professional
// in use with history is never deleted — only deactivated.
export async function toggleProfessionalActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const business = await getCurrentBusiness();
  if (!business) return { ok: false, code: "NO_BUSINESS", message: "Configure seu negócio primeiro." };

  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("id, is_active")
    .eq("business_id", business.id);
  const target = professionals?.find((p) => p.id === id);

  if (!target) {
    return { ok: false, code: "NOT_FOUND", message: "Profissional não encontrado." };
  }

  // Only reactivation (inactive -> active) adds a seat; keep-active is a no-op
  // and deactivation always shrinks the team, so neither needs the gate.
  if (isActive && !target.is_active) {
    const activeCount = (professionals ?? []).filter((p) => p.is_active).length;
    if (!canAddProfessional(activeCount, business.plan)) {
      return { ok: false, code: "PROFESSIONAL_LIMIT", message: limitMessage(business.plan) };
    }
  }

  const { error } = await supabase
    .from("professionals")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return {
      ok: false,
      code: /PLAN_LIMIT|PROFESSIONAL_LIMIT/i.test(String(error.message)) ? "PROFESSIONAL_LIMIT" : "DB_ERROR",
      message: /PLAN_LIMIT|PROFESSIONAL_LIMIT/i.test(String(error.message))
        ? limitMessage(business.plan)
        : "Não foi possível atualizar o profissional.",
    };
  }

  revalidatePath("/dashboard/equipe");
  return { ok: true, data: undefined };
}
