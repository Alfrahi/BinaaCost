// Smoke: legacy /resources and /cost-databases redirect to /cost-library.
// Skips when PocketBase is unreachable (unit-only CI).
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:8090";

test.describe("cost library redirects", () => {
  let canRun = false;
  let email = "";

  test.beforeAll(async ({ request }) => {
    try {
      const h = await request.get(`${BASE}/api/health`);
      canRun = h.ok();
      if (!canRun) return;
      email = `redirect-${Date.now()}@test.dev`;
      await request.post(`${BASE}/api/collections/users/records`, {
        data: {
          email,
          password: "testpass123",
          passwordConfirm: "testpass123",
        },
      });
    } catch {
      canRun = false;
    }
  });

  test("redirects /resources and /cost-databases to /cost-library", async ({
    page,
  }) => {
    test.skip(!canRun, "PocketBase not reachable");
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("testpass123");
    await page.getByRole("button", { name: /sign in|signin|تسجيل/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    await page.goto("/resources");
    await expect(page).toHaveURL(/\/cost-library/);
    await page.goto("/cost-databases");
    await expect(page).toHaveURL(/\/cost-library/);
  });
});