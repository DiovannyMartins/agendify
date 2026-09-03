"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { bookingSchema } from "@/lib/validation/schemas";
import {
  lookupBookingByPublicCode,
  toConsultState,
  type ConsultState,
} from "@/lib/bookings/lookup";
import {
  computeAvailableSlots,
  localDayRangeUtc,
  toUtcRange,
  weekdayOf,
  zonedTimeToUtc,
  type SlotInterval,
  type UtcRange,
} from "@/lib/booking/availability";
import { enforceRateLimit, enforceConsultRateLimit, getClientIp } from "@/lib/booking/rate-limit";
import { verifyTurnstile } from "@/lib/booking/anti-bot";

export type ActionResult = { ok: boolean; code?: string; message?: string; publicCode?: string };

type ServerClient = ReturnType<typeof createAdminClient>;

export async function createBooking(input: {
  slug: string;
  professionalId: string;
  serviceId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
  cfTurnstileToken?: string;
}): Promise<ActionResult> {
  // Server-authoritative flow: the admin client reads blocks/bookings of any
  // business (anonymous RLS would block those reads) for revalidation.
  const supabase = createAdminClient();

  // Anti-bot: when TURNSTILE_SECRET_KEY is configured, require a valid token.
  const gate = await verifyTurnstile(input.cfTurnstileToken);
  if (!gate.ok) {
    return { ok: false, code: "captcha_failed", message: "Verificação humana falhou. Tente novamente." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", input.slug)
    .eq("is_active", true)
    .single();

  if (!business) {
    return { ok: false, code: "not_found", message: "Página não encontrada." };
  }

  // Rate limit before expensive work, keyed on IP+business and a business-wide
  // aggregate (never only on the customer phone).
  const ip = await getClientIp();
  const allowed = await enforceRateLimit(supabase, ip, business.id);
  if (!allowed) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    };
  }

  const startAtIso = zonedTimeToUtc(input.date, input.startTime, business.timezone);

  const parsed = bookingSchema.safeParse({
    serviceId: input.serviceId,
    startAt: startAtIso,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail || "",
    customerNote: input.customerNote || "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "Revise os dados. " + parsed.error.issues[0]?.message,
    };
  }

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", input.serviceId)
    .eq("business_id", business.id)
    .eq("is_active", true)
    .single();
  if (!service) {
    return { ok: false, code: "service_not_found", message: "Serviço indisponível." };
  }

  // The chosen professional must exist, belong to this business and be active.
  // The RPC re-validates this, but rejecting early keeps the error message and
  // the availability revalidation below consistent with the widget's list. A
  // missing OR deactivated professional surfaces as a single `professional_not_found`
  // (the public page only lists active professionals, so this only fires when the
  // professional is deactivated mid-session).
  const { data: professional } = await supabase
    .from("professionals")
    .select("id, business_id, is_active")
    .eq("id", input.professionalId)
    .eq("business_id", business.id)
    .single();
  if (!professional || !professional.is_active) {
    return { ok: false, code: "professional_not_found", message: "Profissional indisponível." };
  }

  // Server-side revalidation of availability (§11.3 step 5). `getSlotRange`
  // returns null only when the day has no active availability range for the
  // chosen professional.
  const slotRange = await getSlotRange(supabase, business.id, professional.id, input.date, business.timezone);
  if (slotRange === null) {
    return { ok: false, code: "no_availability", message: "Este dia não possui horários disponíveis. Escolha outra data." };
  }

  const rules = {
    timezone: business.timezone,
    slotIntervalMinutes: business.slot_interval_minutes,
    minNoticeMinutes: business.min_notice_minutes,
    bookingWindowDays: business.booking_window_days,
  };
  const available = computeAvailableSlots({
    intervals: slotRange.intervals,
    rules,
    durationMinutes: service.duration_minutes,
    date: input.date,
    now: new Date(),
    blocks: slotRange.blocks,
    occupancies: slotRange.occupancies,
  });
  if (!available.includes(input.startTime)) {
    return { ok: false, code: "slot_taken", message: "Esse horário não está mais disponível. Escolha outro." };
  }

  // Remote re-reads the service and enforces the overlap constraint (§11.4).
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_booking", {
    p_business_id: business.id,
    p_service_id: service.id,
    p_professional_id: professional.id,
    p_start_at: startAtIso,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
    p_customer_email: parsed.data.customerEmail || undefined,
    p_customer_note: parsed.data.customerNote || undefined,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("bookings_no_overlap") || /overlap|SLOT|23P01/i.test(message)) {
      return { ok: false, code: "slot_taken", message: "Esse horário acabou de ser reservado. Escolha outro." };
    }
    return { ok: false, code: "db_error", message: "Não foi possível concluir a reserva. Tente novamente." };
  }

  return { ok: true, publicCode: data?.public_code };
}

// Public consultation of a reservation by its public code. Uses the cookie-based
// server client (anon role) — the lookup RPC is granted to anon. The result
// carries only non-personal data (service, date/time, business contact). Gated by
// a per-IP rate limit and the optional Turnstile anti-bot check (fail-open).
export async function consultBooking(
  _prev: ConsultState,
  formData: FormData,
): Promise<ConsultState> {
  const code = String(formData.get("code") ?? "");
  const turnstileToken = String(formData.get("cfTurnstileToken") ?? "");
  const gate = await verifyTurnstile(turnstileToken || undefined);
  if (!gate.ok) {
    return { status: "error", code: "CAPTCHA", message: "Verificação humana falhou. Tente novamente." };
  }

  const supabase = createAdminClient();

  const ip = await getClientIp();
  // Fail-open on the limiter: a transient DB error during a public lookup should
  // not block a legitimate consultation, unlike the reservation flow where the
  // limiter is fail-closed.
  let allowed: boolean;
  try {
    allowed = await enforceConsultRateLimit(supabase, ip);
  } catch {
    allowed = true;
  }
  if (!allowed) {
    return {
      status: "error",
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    };
  }

  const result = await lookupBookingByPublicCode(
    async (c) => {
      const { data, error } = await supabase.rpc("get_booking_by_public_code", { p_code: c });
      return { data: data?.[0] ?? null, error };
    },
    code,
  );
  return toConsultState(result);
}

type SlotRange = {
  intervals: SlotInterval[];
  blocks: UtcRange[];
  occupancies: UtcRange[];
};

async function getSlotRange(
  supabase: ServerClient,
  businessId: string,
  professionalId: string,
  date: string,
  timezone: string,
): Promise<SlotRange | null> {
  const weekday = weekdayOf(date, timezone);

  // Availability, blocks and occupied slots belong to one professional (§ADR
  // 0006), so the revalidation is scoped to the chosen professional.
  const { data: intervals } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("business_id", businessId)
    .eq("professional_id", professionalId)
    .eq("weekday", weekday)
    .eq("is_active", true);

  if (!intervals || intervals.length === 0) return null;

  const day = localDayRangeUtc(date, timezone);

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

  return {
    intervals: intervals.map((i) => ({ startTime: i.start_time, endTime: i.end_time })),
    blocks: (blocks ?? []).map((b) => toUtcRange(b.start_at, b.end_at)),
    occupancies: (bookings ?? []).map((b) => toUtcRange(b.start_at, b.end_at)),
  };
}

