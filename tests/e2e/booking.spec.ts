import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// End-to-end booking flow (§19.3) against a seeded business.
// Setup creates a confirmed user + business + service + availability via the
// service-role API so the public flow and dashboard can be exercised for real.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "senha12345";
const stamp = Date.now().toString().slice(-8);
const EMAIL = `e2e.${stamp}@agendify.dev`;
const SLUG = `e2e-barbearia-${stamp}`;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  const ownerId = user?.user?.id ?? "";
  await admin.from("profiles").upsert({ id: ownerId, display_name: "E2E" }, { onConflict: "id" });
  await admin.from("businesses").upsert(
    {
      owner_id: ownerId,
      name: "Barbearia E2E",
      slug: SLUG,
      phone: "+5511987654321",
      timezone: "America/Sao_Paulo",
      slot_interval_minutes: 30,
      min_notice_minutes: 0,
      booking_window_days: 60,
    },
    { onConflict: "slug" },
  );
  const { data: biz } = await admin.from("businesses").select("*").eq("slug", SLUG).single();
  await admin.from("services").insert({
    business_id: biz.id,
    name: "Corte",
    duration_minutes: 30,
    price_cents: 4000,
  });
  // Availability for every weekday (0-6), 08:00-18:00, so any date has slots.
  for (let wd = 0; wd <= 6; wd++) {
    await admin.from("availability").insert({
      business_id: biz.id,
      weekday: wd,
      start_time: "08:00",
      end_time: "18:00",
    });
  }
});

test("public booking flow: reserve, confirm in dashboard, release on cancel", async ({ page }) => {
  // 1. Public page shows service and an available slot.
  await page.goto(`${BASE_URL}/${SLUG}`);
  await expect(page.getByRole("heading", { name: "Barbearia E2E" })).toBeVisible();
  const serviceSelect = page.getByLabel("Escolha o serviço");
  await serviceSelect.selectOption({ index: 0 });

  // Pick the first available slot for tomorrow within the window.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  await page.getByLabel("Escolha a data").fill(dateStr);

  const slotButton = page.locator("button", { hasText: /^\d{2}:\d{2}$/ }).first();
  await slotButton.waitFor({ state: "visible" });
  await slotButton.click();

  await page.getByLabel("Nome").fill("Cliente E2E");
  await page.getByLabel("Telefone / WhatsApp").fill("+5511977777777");
  await page.getByRole("button", { name: "Confirmar reserva" }).click();

  // 2. Confirmation screen (no personal data beyond service/date/business contact).
  await page.waitForURL(/\/confirmacao\?code=/);
  await expect(page.getByText("Reserva confirmada!")).toBeVisible();

  // 3. Log in as owner and check the dashboard lists the booking.
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("E-mail").fill(EMAIL);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL(/\/dashboard/);
  await page.goto(`${BASE_URL}/dashboard/agenda`);
  await expect(page.getByText("Corte")).toBeVisible();

  // 4. Cancel the booking and confirm the slot is released.
  await page.getByRole("button", { name: "Cancelar" }).first().click();
  await page.getByRole("button", { name: "Confirmar cancelamento" }).click();
  await expect(page.getByText("Cancelada")).toBeVisible();
});
