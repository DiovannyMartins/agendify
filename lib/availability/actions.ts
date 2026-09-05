"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { availabilitySchema } from "@/lib/validation/schemas";
import { getCurrentBusiness } from "@/lib/business/queries";
import { getActiveProfessional } from "@/lib/team/professionals";
import type { ActionResult } from "@/lib/business/actions";import { computeAvailableSlots, localDayRangeUtc, overlaps, toUtcRange, weekdayOf } from "@/lib/booking/availability";
import type { UtcRange } from "@/lib/booking/availability";

export type { ActionResult };

export async function setAvailability(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const professionalId = String(formData.get("professionalId") ?? "");

  const parsed = availabilitySchema.safeParse({ weekday, startTime, endTime });
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Revise os campos de disponibilidade.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const business = await getCurrentBusiness();
  if (!business) return { ok: false, code: "NO_BUSINESS", message: "Configure seu negócio primeiro." };

  const supabase = await createClient();
  const professional = await getActiveProfessional(supabase, business.id, professionalId);
  if (!professional) {
    return { ok: false, code: "PROFESSIONAL_NOT_FOUND", message: "Profissional não encontrado ou inativo." };
  }

  // §9.3: same professional + day ranges must not overlap (agenda is per
  // professional, ADR 0006), so two professionals may share the same slot.
  const { data: existing } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", business.id)
    .eq("professional_id", professional.id)
    .eq("weekday", parsed.data.weekday)
    .eq("is_active", true);

  for (const row of existing ?? []) {
    if (overlaps({ start: row.start_time, end: row.end_time }, { start: startTime, end: endTime })) {
      return {
        ok: false,
        code: "OVERLAP",
        message: "Este intervalo se sobrepõe a um já existente neste dia.",
      };
    }
  }

  const { error } = await supabase.from("availability").insert({
    business_id: business.id,
    professional_id: professional.id,
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (error) return { ok: false, code: "DB_ERROR", message: "Não foi possível salvar." };

  revalidatePath("/dashboard/bloqueios");
  revalidatePath("/dashboard/configuracoes");
  return { ok: true, data: undefined };
}

export async function deleteAvailability(id: string): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;
  const supabase = await createClient();
  await supabase.from("availability").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/dashboard/bloqueios");
  revalidatePath("/dashboard/configuracoes");
}

export async function createBlock(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const startAt = String(formData.get("startAt") ?? "");
  const endAt = String(formData.get("endAt") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const professionalId = String(formData.get("professionalId") ?? "");

  if (!startAt || !endAt) {
    return { ok: false, code: "VALIDATION", message: "Informe o início e o fim do bloqueio." };
  }
  if (new Date(endAt) <= new Date(startAt)) {
    return { ok: false, code: "VALIDATION", message: "O fim deve ser depois do início." };
  }

  const business = await getCurrentBusiness();
  if (!business) return { ok: false, code: "NO_BUSINESS", message: "Configure seu negócio primeiro." };

  const supabase = await createClient();
  const professional = await getActiveProfessional(supabase, business.id, professionalId);
  if (!professional) {
    return { ok: false, code: "PROFESSIONAL_NOT_FOUND", message: "Profissional não encontrado ou inativo." };
  }

  // §9.4: cannot create a block overlapping a future active booking *of the same
  // professional* (ADR 0006). Two professionals may share a time slot.
  const { data: conflicting } = await supabase
    .from("bookings")
    .select("id, customer_name_snapshot, start_at, end_at")
    .eq("business_id", business.id)
    .eq("professional_id", professional.id)
    .neq("status", "cancelled")
    .gt("end_at", startAt)
    .lt("start_at", endAt);

  if (conflicting && conflicting.length > 0) {
    const names = conflicting.map((b) => b.customer_name_snapshot).join(", ");
    return {
      ok: false,
      code: "BOOKING_CONFLICT",
      message: `Bloqueio conflita com reserva(s) futura(s): ${names}. Cancele/reagende antes.`,
    };
  }

  const { error } = await supabase.from("availability_blocks").insert({
    business_id: business.id,
    professional_id: professional.id,
    start_at: startAt,
    end_at: endAt,
    reason,
  });

  if (error) return { ok: false, code: "DB_ERROR", message: "Não foi possível salvar o bloqueio." };

  revalidatePath("/dashboard/bloqueios");
  return { ok: true, data: undefined };
}

export async function deleteBlock(id: string): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;
  const supabase = await createClient();
  await supabase.from("availability_blocks").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/dashboard/bloqueios");
}

export async function getSlotsForDate(
  businessId: string,
  professionalId: string,
  serviceId: string,
  date: string,
): Promise<{ available: string[]; error?: string }> {
  // Public booking flow reads blocks and bookings of any business; anonymous RLS
  // would block that, so we use the server-only admin client for these reads.
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (!business || !business.is_active) return { available: [], error: "not_found" };

  // The professional must exist, belong to this business and be active, so the
  // public flow can never compute slots for a hidden or foreign professional.
  const professional = await getActiveProfessional(supabase, businessId, professionalId);
  if (!professional) return { available: [], error: "professional_not_found" };

  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .eq("is_active", true)
    .single();

  if (!service) return { available: [], error: "service_not_found" };

  const rules = {
    timezone: business.timezone,
    slotIntervalMinutes: business.slot_interval_minutes,
    minNoticeMinutes: business.min_notice_minutes,
    bookingWindowDays: business.booking_window_days,
  };

  // §10.2: interpret "now" and the requested date in the business timezone.
  const weekday = weekdayOf(date, business.timezone);

  // Availability, blocks and occupied slots are resolved for the chosen
  // professional only (§ADR 0006): two professionals in the same slot are
  // allowed, so each professional's agenda is computed independently.
  const { data: intervals } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("business_id", businessId)
    .eq("professional_id", professionalId)
    .eq("weekday", weekday)
    .eq("is_active", true);

  const day = localDayRangeUtc(date, business.timezone);

  const [{ data: blocks }, { data: bookings }] = await Promise.all([
    supabase
      .from("availability_blocks")
      .select("start_at, end_at")
      .eq("business_id", businessId)
      .eq("professional_id", professionalId)
      .lt("start_at", day.end)
      .gt("end_at", day.start),
    supabase
      .from("bookings")
      .select("start_at, end_at")
      .eq("business_id", businessId)
      .eq("professional_id", professionalId)
      .neq("status", "cancelled")
      .lt("start_at", day.end)
      .gt("end_at", day.start),
  ]);

  // Blocks/bookings are read in UTC; computeAvailableSlots resolves each local
  // candidate to UTC before overlap checking (fixes midnight-crossing blocks).
  const occupancies: UtcRange[] = (bookings ?? []).map((b) => toUtcRange(b.start_at, b.end_at));

  const blockRanges: UtcRange[] = (blocks ?? []).map((b) => toUtcRange(b.start_at, b.end_at));

  const available = computeAvailableSlots({
    intervals: (intervals ?? []).map((i) => ({ startTime: i.start_time, endTime: i.end_time })),
    rules,
    durationMinutes: service.duration_minutes,
    date,
    now: new Date(),
    blocks: blockRanges,
    occupancies,
  });

  return { available };
}
