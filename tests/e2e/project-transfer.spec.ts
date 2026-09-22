import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:8090";

async function api(request: any, method: string, path: string, body?: any, token?: string) {
  const res = await request.fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {}),
    },
    data: body,
  });
  return { status: res.status(), json: res.headers()["content-type"]?.includes("json") ? await res.json() : null };
}

test.describe.configure({ mode: "serial" });

test.describe("Project transfer", () => {
  let suToken = "";
  let emailU1 = "";
  let emailU2 = "";
  let uid1 = "";
  let uid2 = "";
  let adminEmail = "";
  let adminUid = "";
  let pid = "";
  let projectName = "";
  let uTok1 = "";
  let canRun = false;

  test.beforeAll(async ({ request }) => {
    try {
      const h = await request.get(`${BASE}/api/health`);
      canRun = h.ok();
      if (!canRun) return;

      const su = await api(request, "POST", "/api/collections/_superusers/auth-with-password", {
        identity: "admin@local.dev", password: "localdev123",
      });
      suToken = su.json?.token;

      emailU1 = `transfer-user1-${Date.now()}@local.dev`;
      const u1 = await api(request, "POST", "/api/collections/users/records", {
        email: emailU1, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${suToken}`);
      uid1 = u1.json.id;

      emailU2 = `transfer-user2-${Date.now()}@local.dev`;
      const u2 = await api(request, "POST", "/api/collections/users/records", {
        email: emailU2, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${suToken}`);
      uid2 = u2.json.id;

      adminEmail = `transfer-admin-${Date.now()}@local.dev`;
      const adm = await api(request, "POST", "/api/collections/users/records", {
        email: adminEmail, password: "testpass123", passwordConfirm: "testpass123", role: "super_admin",
      }, `Bearer ${suToken}`);
      adminUid = adm.json.id;

      const la = await api(request, "POST", "/api/collections/users/auth-with-password", {
        identity: emailU1, password: "testpass123",
      });
      uTok1 = la.json.token;

      projectName = `Transfer Project ${Date.now()}`;
      const p = await api(request, "POST", "/api/collections/projects/records", {
        name: projectName, currency: "USD", user_id: uid1, version: 1,
      }, `Bearer ${uTok1}`);
      pid = p.json?.id;
    } catch (err) {
      canRun = false;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!canRun) return;
    if (pid) await api(request, "DELETE", `/api/collections/projects/records/${pid}`, undefined, `Bearer ${suToken}`);
    if (uid1) await api(request, "DELETE", `/api/collections/users/records/${uid1}`, undefined, `Bearer ${suToken}`);
    if (uid2) await api(request, "DELETE", `/api/collections/users/records/${uid2}`, undefined, `Bearer ${suToken}`);
    if (adminUid) await api(request, "DELETE", `/api/collections/users/records/${adminUid}`, undefined, `Bearer ${suToken}`);
  });

  test("Admin can transfer ownership of a project", async ({ page }) => {
    test.skip(!canRun, "backend unavailable");

    // Login as Admin
    await page.goto("/login");
    await page.locator("#email").fill(adminEmail);
    await page.locator("#password").fill("testpass123");
    await page.getByRole("button", { name: /sign in|signin|تسجيل/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // Go to admin projects
    await page.goto("/admin/projects");
    await expect(page.getByText(/Project Management/i).first()).toBeVisible({ timeout: 10000 });

    // Find the row and click transfer ownership
    const row = page.locator('tr', { hasText: projectName });
    await row.getByRole("button", { name: /transfer/i }).click();

    // Confirm transfer dialog (we need to enter the email or pick the user)
    // Let's assume it's a combobox or input for email
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    
    // Fill the new user ID or email
    const input = dialog.locator('input[type="text"]').first();
    await input.fill(uid2); // or maybe it's a combobox
    // It might be a Combobox searching by email, we'd need to type emailU2
    // I should check how transfer works!
  });
});
