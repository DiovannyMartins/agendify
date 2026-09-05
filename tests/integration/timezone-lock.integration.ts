import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { adminClient, retryOnFk } from "./index";
import { describeTimezoneImpact } from "@/lib/business/timezone-lock";

// Integration smoke for INC-4's timezone-lock path. The server action
// (lib/business/actions.ts §9.5) blocks a timezone change while a business has
// active future bookings, and returns the AFFECTED reservations. The pure
// formatting is unit-tested; here we exercise the database seam the action runs
// against the real project: the future-bookings query must surface confirmed
// bookings with their snapshots and exclude cancelled ones, and the result must
// flow into describeTimezoneImpact as the dashboard renders them.
// RUN: npm run test:integration.
const stamp = Date.now().toString().slice(-8);
const EMAIL = `tzlock.${stamp}@agendify.dev`;
const PASSWORD = "senha12345";
const FUTURE_A = "2099-03-10T15:00:00.000Z"; // future, stays confirmed
const FUTURE_B = "2099-03-10T16:00:00.000Z"; // future, then cancelled

let admin: ReturnType<typeof adminClient>;
let ownerId = "";
let businessId = "";
let professionalId = "";
let serviceId = "";

async function createBookingAt(startAt: string, phone: string) {
  const { data, error } = await admin.rpc("create_booking", {
    p_business_id: businessId,
    p_service_id: serviceId,
    p_professional_id: professionalId,
    p_start_at: startAt,
    p_customer_name: "Cliente TZ",
    p_customer_phone: phone,
  });
  expect(error).toBeNull();
  return data!;
}

beforeAll(async () => {
  admin = adminClient();

  const { data: created } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  ownerId = created?.user?.id ?? "";
  await admin
    .from("profiles")
    .upsert({ id: ownerId, display_name: "Dona Fuso" }, { onConflict: "id" });

  businessId = await retryOnFk(async () => {
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: "Agenda Fuso",
        slug: `agenda-fuso-${stamp}`,
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

  const { data: pros } = await admin.from("professionals").select("id").eq("business_id", businessId);
  professionalId = pros![0].id;

  const { data: svc } = await admin
    .from("services")
    .insert({ business_id: businessId, name: "Corte Fuso", duration_minutes: 30, price_cents: 4000 })
    .select("id")
    .single();
  serviceId = svc!.id;
});

afterAll(async () => {
  await admin.from("businesses").delete().eq("owner_id", ownerId);
  await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
});

describe("timezone lock: future-bookings query + impact (INC-4)", () => {
  it("surfaces an active future booking with its snapshots and excludes a cancelled one", async () => {
    const active = await createBookingAt(FUTURE_A, "+5511990000001");
    const cancelled = await createBookingAt(FUTURE_B, "+5511990000002");
    await admin.rpc("cancel_booking_by_public_code", { p_code: cancelled.public_code });

    // The exact query lib/business/actions.ts uses when the timezone changes.
    const { data, error } = await admin
      .from("bookings")
      .select("id, start_at, service_name_snapshot, customer_name_snapshot")
      .eq("business_id", businessId)
      .gt("start_at", new Date().toISOString())
      .neq("status", "cancelled")
      .order("start_at", { ascending: true });
    expect(error).toBeNull();

    const ids = (data ?? []).map((b) => b.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(cancelled.id);

    const row = (data ?? []).find((b) => b.id === active.id)!;
    expect(row.service_name_snapshot).toBe("Corte Fuso");
    expect(row.customer_name_snapshot).toBe("Cliente TZ");
    expect(new Date(row.start_at).getTime()).toBe(new Date(FUTURE_A).getTime());
  });

  it("feeds the affected rows into describeTimezoneImpact as the dashboard renders them", async () => {
    const { data } = await admin
      .from("bookings")
      .select("id, start_at, service_name_snapshot, customer_name_snapshot")
      .eq("business_id", businessId)
      .gt("start_at", new Date().toISOString())
      .neq("status", "cancelled");

    const impact = describeTimezoneImpact(
      (data ?? []).map((b) => ({
        id: b.id,
        startAt: b.start_at,
        serviceName: b.service_name_snapshot,
        customerName: b.customer_name_snapshot,
      })),
      "America/Sao_Paulo",
    );

    expect(impact.count).toBeGreaterThan(0);
    // 15:00Z is 12:00 in Sao_Paulo (UTC-3, no DST in March).
    expect(impact.items[0].label).toBe("Corte Fuso · Cliente TZ em 10/03/2099 às 12:00");
  });
});
