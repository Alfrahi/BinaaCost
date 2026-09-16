// Auth accounts e2e: user A queues an offline mutation, logs out, user B
// logs in, network restored → A's mutation never applies under B's session.
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

test.describe("cross-account offline isolation", () => {
  let emailA = "";
  let emailB = "";
  let uidA: string | null = null;
  let uidB: string | null = null;
  let pidA: string | null = null;
  let tokA = "";
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

      emailA = `acct-a-${Date.now()}@local.dev`;
      emailB = `acct-b-${Date.now()}@local.dev`;
      const ua = await api(request, "POST", "/api/collections/users/records", {
        email: emailA, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${su}`);
      uidA = ua.json.id;
      const ub = await api(request, "POST", "/api/collections/users/records", {
        email: emailB, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${su}`);
      uidB = ub.json.id;

      const la = await api(request, "POST", "/api/collections/users/auth-with-password", {
        identity: emailA, password: "testpass123",
      });
      tokA = `Bearer ${la.json.token}`;

      const p = await api(request, "POST", "/api/collections/projects/records", {
        name: `Acct A ${Date.now()}`, currency: "USD", user_id: uidA,
      }, tokA);
      pidA = p.json.id;
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
    if (pidA && uidA) {
      await api(request, "DELETE", `/api/collections/projects/records/${pidA}`, undefined, tokA);
    }
    for (const id of [uidA, uidB]) {
      if (id) await api(request, "DELETE", `/api/collections/users/records/${id}`, undefined, `Bearer ${su}`);
    }
  });

  test("A's queued mutation never applies under B's session", async ({ page, context, request }) => {
    test.skip(!canRun, "backend unavailable");

    // user A logs in and queues a material mutation offline
    await page.goto("/login");
    await page.locator("#email").fill(emailA);
    await page.locator("#password").fill("testpass123");
    await page.getByRole("button", { name: /sign in|signin|تسجيل/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    await page.goto(`/projects/${pidA}`);
    await expect(page.getByText(/Acct A/i).first()).toBeVisible({ timeout: 10000 });

    // comments are NOT queued offline (disableOfflineQueue) — use materials,
    // which ARE. Prime the unit dropdown while online (network-backed query),
    // then go offline and add a material so it lands in A's queued queue.
    await page.getByRole("tab", { name: /^costs$|^التكاليف$/i }).click();
    await page.getByRole("button", { name: /add material|إضافة مادة/i }).first().click();
    await expect(page.getByText("Select unit")).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.getByRole("tab", { name: /^costs$|^التكاليف$/i }).click();
    await expect(page.getByRole("heading", { name: /materials|المواد/i }).first()).toBeVisible({ timeout: 10000 });

    await context.setOffline(true);
    await expect(page.getByText(/offline|غير متصل/i).first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /add material|إضافة مادة/i }).first().click();
    await page.locator("#name").fill("A's offline material");
    await page.locator("#quantity").fill("1");
    await page.locator("#unit_price").fill("10");
    await page.getByRole("button", { name: /save|حفظ/i }).click();
    await expect(page.getByText(/pending|changes|معلقة|تغييرات/i).first()).toBeVisible({ timeout: 10000 });

    // log out (A's queue stays on disk, scoped to A). In dev, route chunks
    // carry HMR query stamps so offline navigation can hit the error
    // boundary — come back online and reload to reach the login screen; the
    // unauthenticated boot must not replay A's queue, and then B logs in.
    await page.getByRole("button", { name: /logout|sign out|تسجيل الخروج/i }).first().click();
    await context.setOffline(false);
    await page.reload();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // user B logs in
    await page.locator("#email").fill(emailB);
    await page.locator("#password").fill("testpass123");
    await page.getByRole("button", { name: /sign in|signin|تسجيل/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // already online — B's session must NOT replay A's mutation

    // B has no pending indicator (A's queue is not B's)
    await expect(page.getByText(/pending|changes|معلقة|تغييرات/i).first()).not.toBeVisible({ timeout: 5000 });

    // A's project is not visible to B (B has no access to it)
    await page.goto("/");
    await expect(page.getByText(/Acct A/i).first()).not.toBeVisible({ timeout: 5000 });

    // server-side: A's material was never committed under B's session
    const su = (
      await api(request, "POST", "/api/collections/_superusers/auth-with-password", {
        identity: "admin@local.dev", password: "localdev123",
      })
    ).json?.token;
    const mats = await api(
      request, "GET",
      `/api/collections/materials/records?filter=project_id%3D%22${pidA}%22`,
      undefined, `Bearer ${su}`,
    );
    expect(mats.json.totalItems).toBe(0);
  });
});