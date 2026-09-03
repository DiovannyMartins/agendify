import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { adminClient, anonClientForUser, retryOnFk } from "./index";

// Integration tests against the real Supabase project (§19.2). They verify the
// T01 seam: `professionals` table, `businesses.plan` default, and the
// default-professional seed (trigger on business insert). RUN: npm run
// test:integration. Requires .env.local with valid keys.
const stamp = Date.now().toString().slice(-8);
const EMAIL = `team.${stamp}@agendify.dev`;
const OTHER_EMAIL = `forasteiro.${stamp}@agendify.dev`;
const PASSWORD = "senha12345";
const DISPLAY_NAME = "Dona Ana";

let admin: ReturnType<typeof adminClient>;
let ownerId = "";
let businessId = "";
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
    { id: ownerId, display_name: DISPLAY_NAME },
    { onConflict: "id" },
  );

  businessId = await retryOnFk(async () => {
    const { data: biz, error: bizErr } = await admin
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: "Agenda Ana",
        slug: `agenda-ana-${stamp}`,
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

describe("T01: professionals + businesses.plan", () => {
  it("defaults a new business to plan 'free'", async () => {
    const { data } = await admin.from("businesses").select("plan").eq("id", businessId).single();
    expect(data?.plan).toBe("free");
  });

  it("seeds exactly one default professional from the owner display_name", async () => {
    const { data, error } = await admin
      .from("professionals")
      .select("*")
      .eq("business_id", businessId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const professional = data![0];
    expect(professional.business_id).toBe(businessId);
    expect(professional.name).toBe(DISPLAY_NAME);
    expect(professional.is_active).toBe(true);
    expect(professional.id).toBeTruthy();
  });

  it("the default professional survives a re-check (idempotent seed)", async () => {
    const { data } = await admin.from("professionals").select("id").eq("business_id", businessId);
    expect(data).toHaveLength(1);
  });

  it("the owner can read their professionals; an outsider cannot (RLS)", async () => {
    const owner = await anonClientForUser(EMAIL, PASSWORD);
    const { data: mine } = await owner.from("professionals").select("*").eq("business_id", businessId);
    expect(mine).toHaveLength(1);

    const outsider = await anonClientForUser(OTHER_EMAIL, PASSWORD);
    const { data: theirs } = await outsider
      .from("professionals")
      .select("*")
      .eq("business_id", businessId);
    expect(theirs?.length ?? 0).toBe(0);
  });
});
