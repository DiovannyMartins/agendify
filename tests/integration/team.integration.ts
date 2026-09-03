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
let t05OwnerId = "";
let t06OwnerId = "";
let t06BusinessId = "";
let t07OwnerId = "";

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
  await admin.from("businesses").delete().eq("owner_id", t05OwnerId);
  await admin.from("businesses").delete().eq("owner_id", t06OwnerId);
  await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
  await admin.auth.admin.deleteUser(otherUserId).catch(() => undefined);
  await admin.auth.admin.deleteUser(setupOwnerId).catch(() => undefined);
  await admin.auth.admin.deleteUser(t05OwnerId).catch(() => undefined);
  await admin.auth.admin.deleteUser(t06OwnerId).catch(() => undefined);
  await admin.auth.admin.deleteUser(t07OwnerId).catch(() => undefined);
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

// T05 (fluxo público com escolha de profissional): a página pública lista os
// profissionais ATIVOS do negócio e a reserva é criada vinculada ao profissional
// escolhido. Este bloco verifica o seam de banco que sustenta o fluxo: a listagem
// ativa exclui profissionais inativos, e o RPC create_booking rejeita um
// profissional inativo (sem nunca aceitar um de outro negócio, ver T03).
describe("T05: fluxo público com escolha de profissional", () => {
  let serviceId = "";
  let activeId = "";
  let inactiveId = "";
  // BusinessId (Free, 1 active) can't lawfully hold two active professionals, so
  // the public-flow block runs against its own Pro business (ownerId owns both).
  let proBusinessId = "";

  beforeAll(async () => {
    // A business owner may own exactly one business, so the public-flow block
    // needs its own owner rather than reusing `ownerId`.
    const { data: proOwner } = await admin.auth.admin.createUser({
      email: `publico.${stamp}@agendify.dev`,
      password: PASSWORD,
      email_confirm: true,
    });
    t05OwnerId = proOwner?.user?.id ?? "";
    await admin
      .from("profiles")
      .upsert({ id: t05OwnerId, display_name: "Dona Pública" }, { onConflict: "id" });

    proBusinessId = await retryOnFk(async () => {
      const { data: biz, error: bizErr } = await admin
        .from("businesses")
        .insert({
          owner_id: t05OwnerId,
          name: "Agenda Pública",
          slug: `agenda-publica-${stamp}`,
          phone: "+5511987654323",
          timezone: "America/Sao_Paulo",
          slot_interval_minutes: 30,
          min_notice_minutes: 0,
          booking_window_days: 60,
          plan: "pro",
        })
        .select("*")
        .single();
      if (bizErr) throw new Error(`pro business insert: ${bizErr.message}`);
      return biz!.id;
    });

    const { data: svc } = await admin
      .from("services")
      .insert({ business_id: proBusinessId, name: "Corte T05", duration_minutes: 30, price_cents: 4000 })
      .select("id")
      .single();
    serviceId = svc!.id;

    const { data: active } = await admin
      .from("professionals")
      .insert({ business_id: proBusinessId, name: "Prof Ativo", is_active: true })
      .select("id")
      .single();
    activeId = active!.id;

    const { data: inactive } = await admin
      .from("professionals")
      .insert({ business_id: proBusinessId, name: "Prof Inativo", is_active: false })
      .select("id")
      .single();
    inactiveId = inactive!.id;
  });

  it("the active professional list used by the public page excludes inactive professionals", async () => {
    // proBusinessId's default professional is the owner "Dona Ana"; the active
    // list must contain it plus the active one, but never the inactive one.
    const { data, error } = await admin
      .from("professionals")
      .select("id, name, is_active")
      .eq("business_id", proBusinessId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    expect(error).toBeNull();
    const ids = (data ?? []).map((p) => p.id);
    expect(ids).toContain(activeId);
    expect(ids).not.toContain(inactiveId);
    expect((data ?? []).every((p) => p.is_active)).toBe(true);
  });

  it("the create_booking RPC rejects a booking for an inactive professional", async () => {
    const { error } = await admin.rpc("create_booking", {
      p_business_id: proBusinessId,
      p_service_id: serviceId,
      p_start_at: "2099-05-01T10:00:00.000Z",
      p_customer_name: "Cliente T05",
      p_customer_phone: "+55119577770001",
      p_professional_id: inactiveId,
    });
    expect(error).not.toBeNull();
    expect(String(error?.message).toLowerCase()).toMatch(/inactive|professional|not_found/i);
  });

  it("the create_booking RPC binds the booking to the chosen active professional", async () => {
    const { data, error } = await admin.rpc("create_booking", {
      p_business_id: proBusinessId,
      p_service_id: serviceId,
      p_start_at: "2099-05-01T11:00:00.000Z",
      p_customer_name: "Cliente T05 B",
      p_customer_phone: "+55119577770002",
      p_professional_id: activeId,
    });
    expect(error).toBeNull();
    expect(data?.professional_id).toBe(activeId);
    expect(data?.business_id).toBe(proBusinessId);
  });
});

// T06 (gate de plano, ADR 0007): the professional limit is enforced at the DB so
// it cannot be bypassed by the client. Free=1, Pro=3 active professionals. A
// professional with history is never deleted — only deactivated — so an inactive
// insert is always allowed (it adds no active seat), while reactivation at the
// active limit is rejected.
describe("T06: gate de plano (Free=1, Pro=3)", () => {
  let p3 = "";
  let inactive = "";

  beforeAll(async () => {
    const { data: user } = await admin.auth.admin.createUser({
      email: `t06.${stamp}@agendify.dev`,
      password: PASSWORD,
      email_confirm: true,
    });
    t06OwnerId = user?.user?.id ?? "";
    await admin
      .from("profiles")
      .upsert({ id: t06OwnerId, display_name: "Dona T06" }, { onConflict: "id" });

    // Plan defaults to 'free': the T01 trigger seeds the owner as the single
    // (active) default professional.
    t06BusinessId = await retryOnFk(async () => {
      const { data: biz, error: bizErr } = await admin
        .from("businesses")
        .insert({ owner_id: t06OwnerId, ...businessPayload("Agenda T06", `agenda-t06-${stamp}`, "+5511955555000") })
        .select("*")
        .single();
      if (bizErr) throw new Error(`t06 business insert: ${bizErr.message}`);
      return biz!.id;
    });
  });

  it("a Free business (1 active) blocks a second active professional", async () => {
    const { error } = await admin
      .from("professionals")
      .insert({ business_id: t06BusinessId, name: "Extra", is_active: true })
      .single();
    expect(error).not.toBeNull();
    expect(String(error?.message).toUpperCase()).toMatch(/PLAN_LIMIT|LIMIT/i);
  });

  it("upgrading to Pro allows up to three active professionals, then blocks a fourth", async () => {
    await admin.from("businesses").update({ plan: "pro" }).eq("id", t06BusinessId);

    const { error: e2 } = await admin
      .from("professionals")
      .insert({ business_id: t06BusinessId, name: "Prof 2", is_active: true })
      .single();
    expect(e2).toBeNull();

    const { data: three, error: e3 } = await admin
      .from("professionals")
      .insert({ business_id: t06BusinessId, name: "Prof 3", is_active: true })
      .select("id")
      .single();
    expect(e3).toBeNull();
    p3 = three!.id;

    // At the Pro limit (3 active): a fourth ACTIVE professional is rejected.
    const { error: e4 } = await admin
      .from("professionals")
      .insert({ business_id: t06BusinessId, name: "Prof 4", is_active: true })
      .single();
    expect(e4).not.toBeNull();
    expect(String(e4?.message).toUpperCase()).toMatch(/PLAN_LIMIT|LIMIT/i);
  });

  it("an inactive professional insert is allowed even at the active limit", async () => {
    // Deactivated professionals don't consume a seat, so adding one while at the
    // Pro limit is legal (preserves history instead of deleting).
    const { data, error } = await admin
      .from("professionals")
      .insert({ business_id: t06BusinessId, name: "Off Duty", is_active: false })
      .select("id")
      .single();
    expect(error).toBeNull();
    inactive = data!.id;
  });

  it("reactivating a professional at the active limit is blocked", async () => {
    const { error } = await admin
      .from("professionals")
      .update({ is_active: true })
      .eq("id", inactive)
      .eq("business_id", t06BusinessId);
    expect(error).not.toBeNull();
    expect(String(error?.message).toUpperCase()).toMatch(/PLAN_LIMIT|LIMIT/i);
  });

  it("deactivating frees a seat and allows reactivation below the limit", async () => {
    // Deactivate one active professional (now 2 active + 2 inactive).
    const { error: deact } = await admin
      .from("professionals")
      .update({ is_active: false })
      .eq("id", p3)
      .eq("business_id", t06BusinessId);
    expect(deact).toBeNull();

    // Reactivate below the limit (2 active) -> allowed.
    const { data, error: reac } = await admin
      .from("professionals")
      .update({ is_active: true })
      .eq("id", p3)
      .eq("business_id", t06BusinessId)
      .select("is_active")
      .single();
    expect(reac).toBeNull();
    expect(data?.is_active).toBe(true);
  });
});

// T07 (plano + upgrade self-serve em dev/preview, seam para Stripe — ADR 0007):
// `businesses.plan` is the seat of the monetization gate. This block verifies the
// DB ground-truth the React `setPlan` server action relies on (that action itself
// uses SSR cookies, so it is not exercised here):
//   1. a fresh business defaults to plan 'free' and the gate blocks a second
//      active professional;
//   2. an OWNER SESSION cannot change the plan — the plan-protection trigger means
//      there is no self-serve path straight from the client;
//   3. the PRIVILEGED service_role (the only path setPlan uses in dev/preview)
//      CAN upgrade to 'pro', and then the gate permits up to 3 active professionals.
describe("T07: plano + upgrade self-serve (ADR 0007: seam para Stripe)", () => {
  let freeBusinessId = "";

  beforeAll(async () => {
    const { data: user } = await admin.auth.admin.createUser({
      email: `t07.${stamp}@agendify.dev`,
      password: PASSWORD,
      email_confirm: true,
    });
    t07OwnerId = user?.user?.id ?? "";
    await admin
      .from("profiles")
      .upsert({ id: t07OwnerId, display_name: "Dona T07" }, { onConflict: "id" });

    freeBusinessId = await retryOnFk(async () => {
      const { data: biz, error: bizErr } = await admin
        .from("businesses")
        .insert({
          owner_id: t07OwnerId,
          ...businessPayload("Agenda T07", `agenda-t07-${stamp}`, "+5511955555001"),
        })
        .select("*")
        .single();
      if (bizErr) throw new Error(`t07 business insert: ${bizErr.message}`);
      return biz!.id;
    });
  });

  it("a fresh business defaults to plan 'free'", async () => {
    const { data } = await admin
      .from("businesses")
      .select("plan")
      .eq("id", freeBusinessId)
      .single();
    expect(data?.plan).toBe("free");
  });

  it("the Free plan blocks a second active professional", async () => {
    const { error } = await admin
      .from("professionals")
      .insert({ business_id: freeBusinessId, name: "T07 Extra", is_active: true })
      .single();
    expect(error).not.toBeNull();
    expect(String(error?.message).toUpperCase()).toMatch(/PLAN_LIMIT|LIMIT/i);
  });

  it("an owner SESSION cannot change the plan (no self-serve path from the client)", async () => {
    const owner = await anonClientForUser(`t07.${stamp}@agendify.dev`, PASSWORD);
    const { error } = await owner
      .from("businesses")
      .update({ plan: "pro" })
      .eq("id", freeBusinessId);
    expect(error).not.toBeNull();
    expect(String(error?.message).toUpperCase()).toMatch(/PLAN|SELF_SERVE|FORBIDDEN/i);
  });

  it("the privileged service_role can upgrade the plan (the setPlan path)", async () => {
    const { error } = await admin
      .from("businesses")
      .update({ plan: "pro" })
      .eq("id", freeBusinessId);
    expect(error).toBeNull();

    const { data } = await admin
      .from("businesses")
      .select("plan")
      .eq("id", freeBusinessId)
      .single();
    expect(data?.plan).toBe("pro");
  });

  it("after the upgrade, the gate allows up to three active professionals", async () => {
    const { data: two } = await admin
      .from("professionals")
      .insert({ business_id: freeBusinessId, name: "T07 Prof 2", is_active: true })
      .select("id")
      .single();
    expect(two?.id).toBeTruthy();

    const { data: three } = await admin
      .from("professionals")
      .insert({ business_id: freeBusinessId, name: "T07 Prof 3", is_active: true })
      .select("id")
      .single();
    expect(three?.id).toBeTruthy();

    const { error: blocked } = await admin
      .from("professionals")
      .insert({ business_id: freeBusinessId, name: "T07 Prof 4", is_active: true })
      .single();
    expect(blocked).not.toBeNull();
    expect(String(blocked?.message).toUpperCase()).toMatch(/PLAN_LIMIT|LIMIT/i);
  });
});
