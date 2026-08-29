import { expect, test } from "@playwright/test";

test("landing page shows hero and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1 }).filter({ hasText: "24 horas por dia" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /começar grátis/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como funciona", exact: true })).toBeVisible();
});
