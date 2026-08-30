"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { bookingSchema } from "@/lib/validation/schemas";
import {
  computeAvailableSlots,
  localDayRangeUtc,
  weekdayOf,
  zonedTimeToUtc,
  type SlotInterval,
  type UtcRange,
} from "@/lib/booking/availability";

export type ActionResult = { ok: boolean; code?: string; message?: string; publicCode?: string };

type ServerClient = ReturnType<typeof createAdminClient>;

export async function createBooking(input: {
  slug: string;
  serviceId: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
}): Promise<ActionResult> {
  // Server-authoritative flow: the admin client reads blocks/bookings of any
  // business (anonymous RLS would block those reads) for revalidation.
  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", input.slug)
    .eq("is_active", true)
    .single();

  if (!business) {
    return { ok: false, code: "not_found", message: "Página não encontrada." };
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

  // Server-side revalidation of availability (§11.3 step 5). `getSlotRange`
  // returns null only when the day has no active availability range.
  const slotRange = await getSlotRange(supabase, business.id, input.date, business.timezone);
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

type SlotRange = {
  intervals: SlotInterval[];
  blocks: UtcRange[];
  occupancies: UtcRange[];
};

async function getSlotRange(
  supabase: ServerClient,
  businessId: string,
  date: string,
  timezone: string,
): Promise<SlotRange | null> {
  const weekday = weekdayOf(date, timezone);

  const { data: intervals } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("business_id", businessId)
    .eq("weekday", weekday)
    .eq("is_active", true);

  if (!intervals || intervals.length === 0) return null;

  const day = localDayRangeUtc(date, timezone);

  const [{ data: blocks }, { data: bookings }] = await Promise.all([
    supabase
      .from("availability_blocks")
      .select("start_at, end_at")
      .eq("business_id", businessId)
      .lt("start_at", day.end)
      .gt("end_at", day.start),
    supabase
      .from("bookings")
      .select("start_at, end_at")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .lt("start_at", day.end)
      .gt("end_at", day.start),
  ]);

  return {
    intervals: intervals.map((i) => ({ startTime: i.start_time, endTime: i.end_time })),
    blocks: (blocks ?? []).map((b) => ({ startMs: new Date(b.start_at).getTime(), endMs: new Date(b.end_at).getTime() })),
    occupancies: (bookings ?? []).map((b) => ({ startMs: new Date(b.start_at).getTime(), endMs: new Date(b.end_at).getTime() })),
  };
}

