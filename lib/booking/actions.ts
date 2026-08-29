"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { bookingSchema } from "@/lib/validation/schemas";
import { computeAvailableSlots, overlaps, type SlotInterval } from "@/lib/booking/availability";
import type { TimeRange } from "@/lib/booking/availability";

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

  // Server-side revalidation of availability (§11.3 step 5).
  const slotRange = await getSlotRange(supabase, business.id, input.date, business.timezone);
  if (slotRange) {
    const candidate: TimeRange = {
      start: input.startTime,
      end: addMinutes(input.startTime, service.duration_minutes),
    };
    const overlapsBlocks = slotRange.blocks.some((b) => overlaps(candidate, b));
    const overlapsBooking = slotRange.occupancies.some((o) => overlaps(candidate, o));
    if (overlapsBlocks || overlapsBooking) {
      return { ok: false, code: "slot_taken", message: "Esse horário acabou de ser reservado. Escolha outro." };
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
  blocks: TimeRange[];
  occupancies: TimeRange[];
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

  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T00:00:00Z`);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [{ data: blocks }, { data: bookings }] = await Promise.all([
    supabase
      .from("availability_blocks")
      .select("start_at, end_at")
      .eq("business_id", businessId)
      .lt("start_at", dayEnd.toISOString())
      .gt("end_at", dayStart.toISOString()),
    supabase
      .from("bookings")
      .select("start_at, end_at")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .lt("start_at", dayEnd.toISOString())
      .gt("end_at", dayStart.toISOString()),
  ]);

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return {
    intervals: intervals.map((i) => ({ startTime: i.start_time, endTime: i.end_time })),
    blocks: (blocks ?? []).map((b) => ({ start: fmt.format(new Date(b.start_at)), end: fmt.format(new Date(b.end_at)) })),
    occupancies: (bookings ?? []).map((b) => ({ start: fmt.format(new Date(b.start_at)), end: fmt.format(new Date(b.end_at)) })),
  };
}

function weekdayOf(date: string, timezone: string): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    new Date(`${date}T12:00:00Z`),
  );
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[short] ?? 0;
}

function zonedTimeToUtc(date: string, time: string, timezone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = (utcGuess: number) => Date.UTC(y, m - 1, d, hh, mm) - tzOffsetMinutes(timezone, utcGuess) * 60_000;

  let guess = naive(Date.UTC(y, m - 1, d, hh, mm));
  guess = naive(guess);
  guess = naive(guess);
  return new Date(guess).toISOString();
}

function tzOffsetMinutes(timezone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date(utcMs));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const localAsUtc = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour) % 24, Number(map.minute), Number(map.second),
  );
  return (localAsUtc - utcMs) / 60_000;
}

function addMinutes(time: string, minutes: number): string {
  const t = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + minutes;
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
