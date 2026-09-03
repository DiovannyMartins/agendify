import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { adminClient, anonClientForUser, retryOnFk } from "./index";

// Integration tests against the real Supabase project (§19.2). They verify the
// team seams: T01 `professionals` + `businesses.plan` + default-professional
// seed, and T04 the setup flow seeding that default professional from the
// owner's display_name. RUN: npm run test:integration. Requires .env.local with
// valid keys.
const stamp = Date.now().toString().slice(-8);
const EMAIL = `team.${stamp}@agendify.dev`;
const OTHER_EMAIL = `forasteiro.${stamp}@agendify.dev`;
const PASSWORD = "senha12345";
const DISPLAY_NAME = "Dona Ana";
// T04: the setup path is exercised with a distinct owner so the business is
// created fresh by that owner (not by the service role), matching the real flow.
const SETUP_EMAIL = `setup.${stamp}@agendify.dev`;
const SETUP_DISPLAY_NAME = "Dona Carla";

// The business fields the setup form writes (T01 and T04 both insert the same
// shape; owner_id is the one field that varies per owner).
function businessPayload(name: string, slug: string, phone: string) {
  return {
    name,
    slug,
    phone,
    timezone: "America/Sao_Paulo",
    slot_interval_minutes: 30,
    min_notice_minutes: 0,
    booking_window_days: 60,
  };
}

let admin: ReturnType<typeof adminClient>;
let ownerId = "";
let businessId = "";
let otherUserId = "";
let setupOwnerId = "";
let setupBusinessId = "";

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
      .insert({ owner_id: ownerId, ...businessPayload("Agenda Ana", `agenda-ana-${stamp}`, "+5511987654321") })
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

  const { data: setupUser } = await admin.auth.admin.createUser({
    email: SETUP_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  setupOwnerId = setupUser?.user?.id ?? "";
  await admin.from("profiles").upsert(
    { id: setupOwnerId, display_name: SETUP_DISPLAY_NAME },
    { onConflict: "id" },
  );

  // The owner runs "setup": creates the business through their own authenticated
  // session, so RLS applies to the INVOKER trigger that seeds the default
  // professional (same as the app's rerun of lib/business/actions.upsertBusiness
  // at the DB level — it never calls the server action, which needs cookies).
  const setupOwner = await anonClientForUser(SETUP_EMAIL, PASSWORD);
  setupBusinessId = await retryOnFk(async () => {
    const { data: biz, error: bizErr } = await setupOwner
      .from("businesses")
      .insert({ owner_id: setupOwnerId, ...businessPayload("Agenda Setup", `agenda-setup-${stamp}`, "+5511987654322") })
      .select("*")
      .single();
    if (bizErr) throw new Error(`setup business insert: ${bizErr.message}`);
    return biz!.id;
  });
});

afterAll(async () => {
  await admin.from("businesses").delete().eq("owner_id", ownerId);
  await admin.from("businesses").delete().eq("owner_id", setupOwnerId);
  await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
  await admin.auth.admin.deleteUser(otherUserId).catch(() => undefined);
  await admin.auth.admin.deleteUser(setupOwnerId).catch(() => undefined);
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

// T04 (fundação Equipe): ao concluir o setup (criação do negócio), o sistema cria
// automaticamente o profissional padrão, semeado do display_name do dono. O
// negócio foi criado no beforeAll pela sessão autenticada do dono (RLS aplicada à
// trigger INVOKER), diferente do T01 que inseriu via service_role.
describe("T04: setup cria o profissional padrão para negócios novos", () => {
  it("seeds exactly one active default professional from the owner's display_name", async () => {
    expect(setupBusinessId).toBeTruthy();

    const owner = await anonClientForUser(SETUP_EMAIL, PASSWORD);
    const { data: professionals, error } = await owner
      .from("professionals")
      .select("*")
      .eq("business_id", setupBusinessId);
    expect(error).toBeNull();
    expect(professionals).toHaveLength(1);
    const professional = professionals![0];
    expect(professional.business_id).toBe(setupBusinessId);
    expect(professional.name).toBe(SETUP_DISPLAY_NAME);
    expect(professional.is_active).toBe(true);
    expect(professional.id).toBeTruthy();
  });
});
