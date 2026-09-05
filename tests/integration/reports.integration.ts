import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { adminClient, anonClientForUser, retryOnFk } from "./index";
import { buildBillingReport, type ReportBooking } from "@/lib/reports/reports";

// Integration tests against the real Supabase project. INC-2 (Pro reports): the
// dashboard reads the owner's bookings via RLS and computes the report from the
// snapshot columns. This block verifies (a) an owner can read their own bookings,
// (b) the pure report math is correct on real rows, and (c) an outsider cannot
// read them. RUN: npm run test:integration.
const stamp = Date.now().toString().slice(-8);
const EMAIL = `relatorio.${stamp}@agendify.dev`;
const OUTSIDER_EMAIL = `relatorio-out.${stamp}@agendify.dev`;
const PASSWORD = "senha12345";

// A fixed past window so the report math is independent of the run clock.
const FROM = "2099-05-01T00:00:00.000Z";
const TO = "2099-06-01T00:00:00.000Z";

let admin: ReturnType<typeof adminClient>;
let ownerId = "";
let businessId = "";
let professionalId = "";
let otherOwnerId = "";
let serviceCorte = "";
let serviceBarba = "";
let serviceSobrancelha = "";

// Bookings at distinct times on the (single) default professional. The worked
// example mirrors lib/reports/reports.test.ts.
const PLAN: Array<{ at: string; service: string; name: string; price: number; status: ReportBooking["status"] }> = [
  { at: "2099-05-02T10:00:00.000Z", service: "corte", name: "Corte", price: 4000, status: "completed" },
  { at: "2099-05-02T11:00:00.000Z", service: "corte", name: "Corte", price: 4000, status: "completed" },
  { at: "2099-05-02T12:00:00.000Z", service: "barba", name: "Barba", price: 2500, status: "completed" },
  { at: "2099-05-02T13:00:00.000Z", service: "corte", name: "Corte", price: 3000, status: "cancelled" },
  { at: "2099-05-02T14:00:00.000Z", service: "sobrancelha", name: "Sobrancelha", price: 2000, status: "no_show" },
  { at: "2099-05-02T15:00:00.000Z", service: "corte", name: "Corte", price: 4000, status: "confirmed" },
];

const bookingIds: string[] = [];

beforeAll(async () => {
  admin = adminClient();

  const { data: created } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  ownerId = created?.user?.id ?? "";
  await admin.from("profiles").upsert({ id: ownerId, display_name: "Dona Relatório" }, { onConflict: "id" });

  businessId = await retryOnFk(async () => {
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: "Agenda Relatório",
        slug: `agenda-relatorio-${stamp}`,
        phone: "+5511987654321",
        timezone: "America/Sao_Paulo",
        slot_interval_minutes: 30,
        min_notice_minutes: 0,
        booking_window_days: 60,
        plan: "pro",
      })
      .select("*")
      .single();
    if (bizErr) throw new Error(`business insert: ${bizErr.message}`);
    return biz!.id;
  });

  const { data: pros } = await admin.from("professionals").select("id").eq("business_id", businessId);
  professionalId = pros![0].id;

  for (const [key, name, price] of [
    ["corte", "Corte", 4000],
    ["barba", "Barba", 2500],
    ["sobrancelha", "Sobrancelha", 2000],
  ] as const) {
    const { data: svc } = await admin
      .from("services")
      .insert({ business_id: businessId, name, duration_minutes: 30, price_cents: price })
      .select("id")
      .single();
    if (key === "corte") serviceCorte = svc!.id;
    if (key === "barba") serviceBarba = svc!.id;
    if (key === "sobrancelha") serviceSobrancelha = svc!.id;
  }

  const serviceFor = (key: string) =>
    key === "corte" ? serviceCorte : key === "barba" ? serviceBarba : serviceSobrancelha;

  let phoneIndex = 0;
  for (const plan of PLAN) {
    const phone = `+551199000000${(phoneIndex++).toString().padStart(2, "0")}`;
    const { data: cust } = await admin
      .from("customers")
      .insert({ business_id: businessId, name: "Cliente", phone })
      .select("id")
      .single();
    const end = new Date(new Date(plan.at).getTime() + 30 * 60_000).toISOString();
    const { data: booking, error } = await admin
      .from("bookings")
      .insert({
        business_id: businessId,
        service_id: serviceFor(plan.service),
        professional_id: professionalId,
        customer_id: cust!.id,
        customer_name_snapshot: "Cliente",
        customer_phone_snapshot: phone,
        service_name_snapshot: plan.name,
        duration_minutes_snapshot: 30,
        price_cents_snapshot: plan.price,
        start_at: plan.at,
        end_at: end,
        status: plan.status,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    bookingIds.push(booking!.id);
  }

  // An outsider (own business, own user) that must NOT read these bookings.
  const { data: out } = await admin.auth.admin.createUser({
    email: OUTSIDER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  otherOwnerId = out?.user?.id ?? "";
  await admin.from("profiles").upsert({ id: otherOwnerId, display_name: "Forasteiro" }, { onConflict: "id" });
  await retryOnFk(async () => {
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_id: otherOwnerId,
        name: "Alheia",
        slug: `alheia-${stamp}`,
        phone: "+5511900000001",
        timezone: "America/Sao_Paulo",
        slot_interval_minutes: 30,
        min_notice_minutes: 0,
        booking_window_days: 60,
      })
      .select("*")
      .single();
    if (bizErr) throw new Error(`other business insert: ${bizErr.message}`);
    return biz!.id;
  });
});

afterAll(async () => {
  await admin.from("businesses").delete().eq("owner_id", ownerId);
  await admin.from("businesses").delete().eq("owner_id", otherOwnerId);
  await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
  await admin.auth.admin.deleteUser(otherOwnerId).catch(() => undefined);
});

describe("INC-2 relatórios: dados + RLS", () => {
  it("the owner can read their own bookings via RLS", async () => {
    const owner = await anonClientForUser(EMAIL, PASSWORD);
    const { data, error } = await owner
      .from("bookings")
      .select("id, status, start_at, price_cents_snapshot, service_name_snapshot")
      .eq("business_id", businessId)
      .gte("start_at", FROM)
      .lt("start_at", TO);
    expect(error).toBeNull();
    expect(data).toHaveLength(6);
    expect(data!.map((b) => b.id).sort()).toEqual([...bookingIds].sort());
  });

  it("an outsider cannot read another business's bookings (RLS)", async () => {
    const outsider = await anonClientForUser(OUTSIDER_EMAIL, PASSWORD);
    const { data } = await outsider
      .from("bookings")
      .select("id")
      .eq("business_id", businessId);
    expect(data?.length ?? 0).toBe(0);
  });

  it("computes the billing report from real rows (revenue, top service, rates)", async () => {
    const owner = await anonClientForUser(EMAIL, PASSWORD);
    const { data } = await owner
      .from("bookings")
      .select("id, status, start_at, price_cents_snapshot, service_name_snapshot")
      .eq("business_id", businessId)
      .gte("start_at", FROM)
      .lt("start_at", TO);
    const report = buildBillingReport(data as unknown as ReportBooking[], { from: FROM, to: TO });
    expect(report.totalBookings).toBe(6);
    expect(report.completed).toBe(3);
    expect(report.cancelled).toBe(1);
    expect(report.noShow).toBe(1);
    expect(report.confirmed).toBe(1);
    expect(report.revenueCents).toBe(10500);
    expect(report.topService).toEqual({ name: "Corte", count: 2, revenueCents: 8000 });
    expect(report.cancellationRate).toBeCloseTo(1 / 6, 10);
    expect(report.noShowRate).toBeCloseTo(1 / 6, 10);
  });
});
