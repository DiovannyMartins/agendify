import { expect, test } from "@playwright/test";

test("landing page shows hero and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1 }).filter({ hasText: "24 horas por dia" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como funciona", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Um único plano", exact: true })).toBeVisible();
});

test("auth and legal pages render", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Acesse seu painel do Agendify.")).toBeVisible();
  await page.goto("/cadastro");
  await expect(page.getByText("Comece a receber reservas grátis.")).toBeVisible();
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de Uso" })).toBeVisible();
});

test("dashboard redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
