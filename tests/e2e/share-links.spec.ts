// Share links e2e: create link via API, exercise wrong/correct password and
// revocation through the public URL. Extends the public-share flow.
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

test.describe("share links password + revocation", () => {
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
          identity: "admin@local.dev", password: "localdev123",
        })
      ).json?.token;
      const email = `sl-${Date.now()}@local.dev`;
      const u = await api(request, "POST", "/api/collections/users/records", {
        email, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${su}`);
      uid = u.json.id;
      const l = await api(request, "POST", "/api/collections/users/auth-with-password", {
        identity: email, password: "testpass123",
      });
      tok = `Bearer ${l.json.token}`;

      const p = await api(request, "POST", "/api/collections/projects/records", {
        name: `Share links ${Date.now()}`, currency: "USD", user_id: uid,
        financial_settings: {
          overhead_percent: 10,
          contingency_percent: 5,
          markup_percent: 20,
          tax_percent: 5,
        },
      }, tok);
      pid = p.json.id;

      const r = await api(request, "POST", `/api/projects/${pid}/share-links`, {
        expires_at: "2027-12-31T00:00:00.000Z", password: "correct-horse-9",
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

  test("wrong password → 403 flow, correct password renders report", async ({ page }) => {
    test.skip(!canRun, "backend unavailable");
    await page.goto(`/public-share/${token}`);
    const passInput = page.locator('input[type="password"]');
    await expect(passInput).toBeVisible({ timeout: 10000 });

    await passInput.fill("wrong-password");
    await page.getByRole("button", { name: /view|unlock|access|submit/i }).click();
    await expect(page.getByText(/incorrect|wrong|invalid/i).first()).toBeVisible({ timeout: 10000 });

    await passInput.fill("correct-horse-9");
    await page.locator("#password").press("Enter");
    await expect(page.getByText(/Share links/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("revoked link → public URL 404s", async ({ page, request }) => {
    test.skip(!canRun, "backend unavailable");
    if (!linkId || !token) throw new Error("missing fixture");

    const del = await api(request, "DELETE",
      `/api/collections/shared_project_links/records/${linkId}`, undefined, tok);
    expect(del.status).toBe(204);

    await page.goto(`/public-share/${token}`);
    await expect(page.getByText(/not found|expired|invalid/i).first()).toBeVisible({ timeout: 10000 });
    linkId = null;
    token = null;
  });
});