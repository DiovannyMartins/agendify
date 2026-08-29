import { expect, test } from "@playwright/test";

test("unknown public slug returns 404", async ({ page }) => {
  const response = await page.goto("/slug-que-nao-existe-xyz");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});

test("dashbboard setup redirects when no business", async ({ page }) => {
  // Unauthenticated -> redirected to login by proxy (not /setup).
  await page.goto("/dashboard/setup");
  await expect(page).toHaveURL(/\/login/);
});
