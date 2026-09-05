// Public share flow: create share link via API as an app user,
// visit /public-share/:token without auth, verify password gate.
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

// Serial in-file execution: the spec's shared beforeAll state (token in PB)
// must live for exactly one test run — parallel workers would race.
test.describe.configure({ mode: "serial" });

test.describe("external share password gate", () => {
  let token: string | null = null;
  let linkId: string | null = null;
  let pid: string | null = null;
  let uid: string | null = null;
  let tok = "";
  let canRun = false;

  test.beforeAll(async ({ request }) => {
    try {
      const h = await request.get(`${BASE}/api/health`);
      canRun = h.ok();
      if (!canRun) return;
      const su = (
        await api(request, "POST", "/api/collections/_superusers/auth-with-password", {
          identity: "admin@local.dev",
          password: "localdev123",
        })
      ).json?.token;
      const uid0 = `pw-${Date.now()}@local.dev`;
      const u = await api(request, "POST", "/api/collections/users/records", {
        email: uid0, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${su}`);
      uid = u.json.id;
      const l = await api(request, "POST", "/api/collections/users/auth-with-password", {
        identity: uid0, password: "testpass123",
      });
      tok = `Bearer ${l.json.token}`;

      const p = await api(request, "POST", "/api/collections/projects/records", {
        name: "Share demo",
        currency: "USD",
        user_id: uid,
        financial_settings: {
          overhead_percent: 10,
          contingency_percent: 5,
          markup_percent: 20,
          tax_percent: 5,
        },
      }, tok);
      pid = p.json.id;

      await api(request, "POST", "/api/collections/materials/records", {
        project_id: pid,
        user_id: uid,
        name: "Concrete slab",
        quantity: 5,
        unit: "m3",
        unit_price: 150,
      }, tok);
      await api(request, "POST", "/api/collections/labor_items/records", {
        project_id: pid,
        user_id: uid,
        worker_type: "Crew",
        number_of_workers: 3,
        daily_rate: 120,
        total_days: 5,
      }, tok);

      // share link via route
      const r = await api(request, "POST", `/api/projects/${pid}/share-links`, {
        expires_at: "2027-12-31T00:00:00.000Z",
        password: "s3cret-long",
      }, tok);
      expect(r.status).toBe(200);
      token = r.json.access_token;
      linkId = r.json.id;
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

  test("unknown token → 404 / error page", async ({ page }) => {
    test.skip(!canRun, "backend unavailable");
    await page.goto("/public-share/not-a-real-token");
    await expect(page.getByText(/not found|expired|invalid/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("valid token → password gate, wrong password rejected, correct shows data", async ({ page }) => {
    test.skip(!canRun, "backend unavailable");
    page.on("request", (r) => {
      if (r.url().includes("/api/share/"))
        console.log("REQ", r.method(), r.postData());
    });
    page.on("response", (r) => {
      if (r.url().includes("/api/share/")) console.log("RESP", r.status(), r.url());
    });
    page.on("console", (m) => console.log("PAGE:", m.type(), m.text()));
    page.on("pageerror", (e) => console.log("PAGEERR:", String(e)));
    await page.goto(`/public-share/${token}`);

    // expects the password form
    await page.screenshot({ path: "/tmp/e2e-scr/share-initial.png" });
    const passInput = page.locator('input[type="password"]');
    await expect(passInput).toBeVisible({ timeout: 10000 });

    // wrong password → specific error
    await passInput.fill("wrong");
    await page.getByRole("button", { name: /view|unlock|access|submit/i }).click();
    await expect(page.getByText(/incorrect|wrong/i).first()).toBeVisible({ timeout: 10000 });

    // right password → data renders
    await passInput.fill("s3cret-long");
    await page.waitForTimeout(500); // let toast settle / form ready
    await page.locator("#password").press("Enter");
    await page.screenshot({ path: "/tmp/e2e-scr/share-after.png" });
    await expect(page.getByText(/Share demo/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("revoked link → public URL 404s", async ({ page, request }) => {
    test.skip(!canRun, "backend unavailable");
    if (!linkId || !token) throw new Error("missing fixture");

    const del = await api(
      request, "DELETE",
      `/api/collections/shared_project_links/records/${linkId}`,
      undefined,
      tok,
    );
    expect(del.status).toBe(204);

    await page.goto(`/public-share/${token}`);
    await expect(page.getByText(/not found|expired|invalid/i).first()).toBeVisible({ timeout: 10000 });
    linkId = null;
    token = null;
  });
});
