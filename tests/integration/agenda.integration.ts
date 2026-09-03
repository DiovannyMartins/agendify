import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { adminClient, retryOnFk } from "./index";

// Integration tests against the real Supabase project (§19.2). They verify the
// T02 seam: `professional_id` on availability/availability_blocks/bookings, the
// per-professional no-overlap exclusion constraint, and the default-professional
// association. RUN: npm run test:integration. Requires .env.local with valid keys.
const stamp = Date.now().toString().slice(-8);
const EMAIL = `agenda.${stamp}@agendify.dev`;
const PASSWORD = "senha12345";
const DISPLAY_NAME = "Dona Ana";

// Far-future instants; a fresh business/professional means no cross-run collisions.
const SLOT = "2099-03-01T14:00:00.000Z";
const SLOT_END = "2099-03-01T14:30:00.000Z";
const SLOT2 = "2099-03-01T16:00:00.000Z";
const SLOT2_END = "2099-03-01T16:30:00.000Z";

let admin: ReturnType<typeof adminClient>;
let ownerId = "";
let businessId = "";
let serviceId = "";
let customerId = "";
let defaultProfessionalId = "";
let secondProfessionalId = "";

beforeAll(async () => {
  admin = adminClient();

  const { data: created } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  ownerId = created?.user?.id ?? "";
  await admin.from("profiles").upsert(
    { id: ownerId, display_name: DISPLAY_NAME },
    { onConflict: "id" },
  );

  businessId = await retryOnFk(async () => {
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: "Agenda Perfil",
        slug: `agenda-perfil-${stamp}`,
        phone: "+5511987654321",
        timezone: "America/Sao_Paulo",
        slot_interval_minutes: 30,
        min_notice_minutes: 0,
        booking_window_days: 60,
      })
      .select("*")
      .single();
    if (bizErr) throw new Error(`business insert: ${bizErr.message}`);
    return biz!.id;
  });

  // The T01 trigger seeds exactly one default professional (the owner).
  const { data: defaults } = await admin
    .from("professionals")
    .select("id")
    .eq("business_id", businessId);
  expect(defaults).toHaveLength(1);
  defaultProfessionalId = defaults![0].id;

  const { data: p2 } = await admin
    .from("professionals")
    .insert({ business_id: businessId, name: "Prof 2", is_active: true })
    .select("*")
    .single();
  secondProfessionalId = p2!.id;

  const { data: svc } = await admin
    .from("services")
    .insert({ business_id: businessId, name: "Corte", duration_minutes: 30, price_cents: 4000 })
    .select("*")
    .single();
  serviceId = svc!.id;

  const { data: cust } = await admin
    .from("customers")
    .insert({ business_id: businessId, name: "Maria", phone: "+5511944444444" })
    .select("*")
    .single();
  customerId = cust!.id;
});

afterAll(async () => {
  await admin.from("businesses").delete().eq("owner_id", ownerId);
  await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
});

// Direct booking insert with an explicit professional (create_booking is T03 and
// only supports the default professional today; this exercises the constraint).
function bookingInsert(professionalId: string, startAt: string, endAt: string, phone: string) {
  return admin
    .from("bookings")
    .insert({
      business_id: businessId,
      service_id: serviceId,
      professional_id: professionalId,
      customer_id: customerId,
      customer_name_snapshot: "Cliente",
      customer_phone_snapshot: phone,
      service_name_snapshot: "Corte",
      duration_minutes_snapshot: 30,
      price_cents_snapshot: 4000,
      start_at: startAt,
      end_at: endAt,
    })
    .select("*")
    .single();
}

describe("T02: agenda por profissional (§ADR 0006)", () => {
  it("two different professionals can book the same slot (constraint per professional)", async () => {
    const { data: b1, error: e1 } = await bookingInsert(defaultProfessionalId, SLOT, SLOT_END, "+5511951111111");
    expect(e1).toBeNull();
    expect(b1?.professional_id).toBe(defaultProfessionalId);

    const { data: b2, error: e2 } = await bookingInsert(secondProfessionalId, SLOT, SLOT_END, "+5511952222222");
    expect(e2).toBeNull();
    expect(b2?.professional_id).toBe(secondProfessionalId);
  });

  it("the same professional overlapping a booking is rejected", async () => {
    const { error } = await bookingInsert(defaultProfessionalId, SLOT, SLOT_END, "+5511953333333");
    expect(error).not.toBeNull();
    expect(String(error?.message).toLowerCase()).toMatch(/overlap|exclusion|conflict|violat/i);
  });

  it("a block on another professional does not conflict with a booking", async () => {
    // Book ONLY the default professional at a fresh slot.
    const { error: bookErr } = await bookingInsert(defaultProfessionalId, SLOT2, SLOT2_END, "+5511955555555");
    expect(bookErr).toBeNull();
    // A block covering that slot on the SECOND professional (which has no booking
    // there) must be allowed — overlap is per professional.
    const { data: block, error } = await admin
      .from("availability_blocks")
      .insert({
        business_id: businessId,
        professional_id: secondProfessionalId,
        start_at: "2099-03-01T15:30:00.000Z",
        end_at: "2099-03-01T17:00:00.000Z",
        reason: "pausa outro profissional",
      })
      .select("professional_id")
      .single();
    expect(error).toBeNull();
    expect(block?.professional_id).toBe(secondProfessionalId);
  });

  it("a booking without an explicit professional is associated to the default professional", async () => {
    const { data, error } = await admin.rpc("create_booking", {
      p_business_id: businessId,
      p_service_id: serviceId,
      p_start_at: "2099-03-01T15:00:00.000Z",
      p_customer_name: "Sem Profissional",
      p_customer_phone: "+5511954444444",
    });
    expect(error).toBeNull();
    expect(data?.professional_id).toBe(defaultProfessionalId);
  });

  it("availability without an explicit professional is associated to the default professional", async () => {
    const { data, error } = await admin
      .from("availability")
      .insert({
        business_id: businessId,
        weekday: 2,
        start_time: "08:00",
        end_time: "12:00",
      })
      .select("professional_id")
      .single();
    expect(error).toBeNull();
    expect(data?.professional_id).toBe(defaultProfessionalId);
  });

  it("two professionals can hold the same availability window constraint (unique per professional)", async () => {
    // Different professionals, same weekday + start: the migration moved the
    // unique constraint from (business_id, weekday, start) to (professional_id,
    // weekday, start), so this is allowed.
    const { error: e1 } = await admin
      .from("availability")
      .insert({ business_id: businessId, professional_id: secondProfessionalId, weekday: 3, start_time: "08:00", end_time: "12:00" });
    expect(e1).toBeNull();

    const { error: e2 } = await admin
      .from("availability")
      .insert({ business_id: businessId, professional_id: defaultProfessionalId, weekday: 3, start_time: "08:00", end_time: "12:00" });
    expect(e2).toBeNull();
  });
});
