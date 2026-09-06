// Offline queue e2e: add a material while offline (network intercepted),
// verify the queued indicator, go online, and confirm the material appears
// exactly once with content intact. Includes an Arabic-text variant.
//
// NOTE: comments are intentionally NOT queued offline (disableOfflineQueue),
// so the offline queue is exercised via materials, which ARE queued.
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:8090";
async function api(request: any, method: string, path: string, body?: any, token?: string) {
  const res = await request.fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` }
        : {}),
    },
    data: body,
  });
  return { status: res.status(), json: res.headers()["content-type"]?.includes("json") ? await res.json() : null };
}

test.describe.configure({ mode: "serial" });

test.describe("offline material queue", () => {
  let email = "";
  let uid: string | null = null;
  let pid: string | null = null;
  let tok = "";
  let canRun = false;

  test.beforeAll(async ({ request }) => {
    try {
      const h = await request.get(`${BASE}/api/health`);
      canRun = h.ok();
      if (!canRun) return;
      const su = (
        await api(request, "POST", "/api/collections/_superusers/auth-with-password", {
          identity: "admin@local.dev", password: "localdev123",
        })
      ).json?.token;
      email = `off-${Date.now()}@local.dev`;
      const u = await api(request, "POST", "/api/collections/users/records", {
        email, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${su}`);
      uid = u.json.id;
      const l = await api(request, "POST", "/api/collections/users/auth-with-password", {
        identity: email, password: "testpass123",
      });
      tok = `Bearer ${l.json.token}`;

      const p = await api(request, "POST", "/api/collections/projects/records", {
        name: `Offline ${Date.now()}`, currency: "USD", user_id: uid,
        financial_settings: {
          overhead_percent: 10,
          contingency_percent: 5,
          markup_percent: 20,
          tax_percent: 5,
        },
      }, tok);
      pid = p.json.id;
    } catch (err) {
      console.error("beforeAll failed:", err);
      canRun = false;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!canRun) return;
    const su = (
      await api(request, "POST", "/api/collections/_superusers/auth-with-password", {
        identity: "admin@local.dev", password: "localdev123",
      })
    ).json?.token;
    if (pid && uid) {
      await api(request, "DELETE", `/api/collections/projects/records/${pid}`, undefined, tok);
      await api(request, "DELETE", `/api/collections/users/records/${uid}`, undefined, `Bearer ${su}`);
    }
  });

  async function login(page: any) {
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("testpass123");
    await page.getByRole("button", { name: /sign in|signin|تسجيل/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
  }

  async function openCostsTab(page: any) {
    await page.goto(`/projects/${pid}`);
    await page.getByRole("tab", { name: /costs|التكاليف/i }).click();
    await expect(page.getByRole("heading", { name: /materials|المواد/i }).first()).toBeVisible({ timeout: 10000 });
  }

  async function addMaterialOffline(page: any, name: string) {
    await page.getByRole("button", { name: /add material|إضافة مادة/i }).first().click();
    await page.locator("#name").fill(name);
    await page.locator("#quantity").fill("2");
    await page.locator("#unit_price").fill("15.5");
    // wait for the unit dropdown to be populated (defaults to first option)
    await expect(page.getByText("Select unit")).not.toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /save|حفظ/i }).click();
  }

  // material units come from a network-backed settings query; open and close
  // the dialog once while online so the React Query cache is warm before
  // going offline. Reload to dismiss the form (it has no close control).
  async function primeUnitsCache(page: any) {
    await page.getByRole("button", { name: /add material|إضافة مادة/i }).first().click();
    await expect(page.getByText("Select unit")).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.getByRole("tab", { name: /costs|التكاليف/i }).click();
    await expect(page.getByRole("heading", { name: /materials|المواد/i }).first()).toBeVisible({ timeout: 10000 });
  }

  test("material queued offline appears once with content intact after going online", async ({ page, context }) => {
    test.skip(!canRun, "backend unavailable");
    await login(page);
    await openCostsTab(page);
    await primeUnitsCache(page);

    await context.setOffline(true);
    await expect(page.getByText(/offline|غير متصل/i).first()).toBeVisible({ timeout: 10000 });
    // let the offline state propagate to offlineManager (separate effect)
    await page.waitForTimeout(1000);

    await addMaterialOffline(page, "queued offline material");

    // queued indicator appears
    await expect(page.getByText(/changes pending|تغييرات معلقة/i).first()).toBeVisible({ timeout: 10000 });

    // go back online — the offline manager auto-syncs on reconnect, so just
    // wait for the queued material to land exactly once with intact name
    await context.setOffline(false);
    await expect(page.getByText("queued offline material")).toHaveCount(1, { timeout: 15000 });
  });

  test("Arabic material name round-trips through the offline queue", async ({ page, context }) => {
    test.skip(!canRun, "backend unavailable");
    await login(page);
    await openCostsTab(page);
    await primeUnitsCache(page);

    await context.setOffline(true);
    await expect(page.getByText(/offline|غير متصل/i).first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    await addMaterialOffline(page, "مادة تجريبية باللغة العربية");

    await expect(page.getByText(/changes pending|تغييرات معلقة/i).first()).toBeVisible({ timeout: 10000 });

    await context.setOffline(false);
    await expect(page.getByText("مادة تجريبية باللغة العربية")).toHaveCount(1, { timeout: 15000 });
  });
});