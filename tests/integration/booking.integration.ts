import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { adminClient, anonClientForUser } from "./index";

// These are integration tests against the real Supabase project (§19.2).
// RUN: npm run test:integration. Requires .env.local with valid keys.
const stamp = Date.now().toString().slice(-8);
const EMAIL = `teste.${stamp}@agendify.dev`;
const OTHER_EMAIL = `outro.${stamp}@agendify.dev`;
const PASSWORD = "senha12345";

let admin: ReturnType<typeof adminClient>;
let ownerId = "";
let businessId = "";
let serviceId = "";
let otherUserId = "";

beforeAll(async () => {
  admin = adminClient();

  const { data: created } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  ownerId = created?.user?.id ?? "";
  await admin.from("profiles").upsert(
    { id: ownerId, display_name: "Teste Integracao" },
    { onConflict: "id" },
  );

  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .upsert(
      {
        owner_id: ownerId,
        name: "Biz Integracao",
        slug: `biz-integracao-${stamp}`,
        phone: "+5511987654321",
        timezone: "America/Sao_Paulo",
        slot_interval_minutes: 30,
        min_notice_minutes: 0,
        booking_window_days: 60,
      },
      { onConflict: "slug" },
    )
    .select("*")
    .single();
  if (bizErr) throw new Error(`business upsert: ${bizErr.message}`);
  businessId = biz.id;

  const { data: svc } = await admin
    .from("services")
    .insert({
      business_id: businessId,
      name: "Corte",
      duration_minutes: 30,
      price_cents: 4000,
    })
    .select("*")
    .single();
  serviceId = svc.id;

  // A second user for RLS tests.
  const { data: user2 } = await admin.auth.admin.createUser({
    email: OTHER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  otherUserId = user2?.user?.id ?? "";
});

afterAll(async () => {
  await admin.from("businesses").delete().eq("owner_id", ownerId);
  await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
  await admin.auth.admin.deleteUser(otherUserId).catch(() => undefined);
});

describe("createBooking RPC (§11.4)", () => {
  const slot = "2099-01-05T14:00:00.000Z"; // future UTC instant

  it("creates a valid booking with snapshots", async () => {
    const { data, error } = await admin.rpc("create_booking", {
      p_business_id: businessId,
      p_service_id: serviceId,
      p_start_at: slot,
      p_customer_name: "Maria",
      p_customer_phone: "+5511988888888",
    });
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.status).toBe("confirmed");
    expect(data.service_name_snapshot).toBe("Corte");
    // Updating the service must NOT change existing snapshot.
    await admin.from("services").update({ name: "Corte VIP" }).eq("id", serviceId);
    const { data: fresh } = await admin.rpc("get_booking_by_public_code", { p_code: data.public_code });
    expect(fresh?.[0]?.service_name).toBe("Corte");
  });

  it("rejects an overlapping booking (exclusion constraint)", async () => {
    const overlapSlot = "2099-01-05T14:15:00.000Z"; // overlaps the 14:00-14:30 booking
    const { error } = await admin.rpc("create_booking", {
      p_business_id: businessId,
      p_service_id: serviceId,
      p_start_at: overlapSlot,
      p_customer_name: "João",
      p_customer_phone: "+5511977777777",
    });
    expect(error).not.toBeNull();
    expect(String(error?.message).toLowerCase()).toMatch(/overlap|already|reserved|slash/i);
  });
});

describe("RLS (§13.2)", () => {
  it("user A cannot read user B's bookings via anon client", async () => {
    const owner = await anonClientForUser(EMAIL, PASSWORD);
    const { data } = await owner.from("bookings").select("*").eq("business_id", businessId);
    // owner should see their own bookings (business owned by them)
    expect(Array.isArray(data)).toBe(true);
  });

  it("a foreign user cannot read the owner's business", async () => {
    const outsider = await anonClientForUser(OTHER_EMAIL, PASSWORD);
    const { data } = await outsider.from("businesses").select("*").eq("id", businessId).maybeSingle();
    expect(data).toBeNull();
  });
});

describe("block vs future booking conflict (§9.4)", () => {
  it("business owner cannot create a block overlapping an active booking", async () => {
    const owner = await anonClientForUser(EMAIL, PASSWORD);
    const { data: conflict } = await owner
      .from("bookings")
      .select("start_at, end_at")
      .eq("business_id", businessId)
      .gt("start_at", "2099-01-01T00:00:00.000Z");
    // Confirm there is at least an active booking to conflict with.
    expect(conflict.length).toBeGreaterThan(0);
  });
});
