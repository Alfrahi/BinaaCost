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

test.describe("Project lifecycle: soft-deletion and restoration", () => {
  let suToken = "";
  let emailU = "";
  let adminEmail = "";
  let uid = "";
  let adminUid = "";
  let pid = "";
  let projectName = "";
  let uTok = "";
  let canRun = false;

  test.beforeAll(async ({ request }) => {
    try {
      const h = await request.get(`${BASE}/api/health`);
      canRun = h.ok();
      if (!canRun) return;

      // 1. Authenticate as superuser
      const su = await api(request, "POST", "/api/collections/_superusers/auth-with-password", {
        identity: "admin@local.dev", password: "localdev123",
      });
      suToken = su.json?.token;

      // 2. Create a test user
      emailU = `lifecycle-user-${Date.now()}@local.dev`;
      const ua = await api(request, "POST", "/api/collections/users/records", {
        email: emailU, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, `Bearer ${suToken}`);
      uid = ua.json.id;

      // 3. Create an admin user
      adminEmail = `lifecycle-admin-${Date.now()}@local.dev`;
      const adm = await api(request, "POST", "/api/collections/users/records", {
        email: adminEmail, password: "testpass123", passwordConfirm: "testpass123", role: "super_admin",
      }, `Bearer ${suToken}`);
      adminUid = adm.json.id;

      // 4. User logs in
      const la = await api(request, "POST", "/api/collections/users/auth-with-password", {
        identity: emailU, password: "testpass123",
      });
      uTok = la.json.token;

      // 5. Create a project for the user via API
      projectName = `Lifecycle Project ${Date.now()}`;
      const p = await api(request, "POST", "/api/collections/projects/records", {
        name: projectName, currency: "USD", user_id: uid, version: 1,
      }, `Bearer ${uTok}`);
      pid = p.json?.id;
    } catch (err) {
      console.error("beforeAll failed:", err);
      canRun = false;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!canRun) return;
    if (pid) {
      await api(request, "DELETE", `/api/collections/projects/records/${pid}`, undefined, `Bearer ${suToken}`);
    }
    if (uid) {
      await api(request, "DELETE", `/api/collections/users/records/${uid}`, undefined, `Bearer ${suToken}`);
    }
    if (adminUid) {
      await api(request, "DELETE", `/api/collections/users/records/${adminUid}`, undefined, `Bearer ${suToken}`);
    }
  });

  test("User can soft-delete a project from the UI", async ({ page }) => {
    test.skip(!canRun, "backend unavailable");

    // Login user
    await page.goto("/login");
    await page.locator("#email").fill(emailU);
    await page.locator("#password").fill("testpass123");
    await page.getByRole("button", { name: /sign in|signin|تسجيل/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // Go to project detail
    await page.goto(`/projects/${pid}`);
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 10000 });

    // Click delete
    // Wait for the button
    await page.getByRole("button", { name: /delete|حذف/i }).first().click();
    
    // Confirm delete in the alertdialog.
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole("button", { name: /delete|حذف/i }).click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    // And project not visible
    await expect(page.getByText(projectName).first()).not.toBeVisible({ timeout: 5000 });
  });

  test("Admin can restore the soft-deleted project", async ({ page }) => {
    test.skip(!canRun, "backend unavailable");

    // Logout user
    await page.goto("/");
    const logoutBtn = page.getByRole("button", { name: /logout|sign out|تسجيل الخروج/i }).first();
    if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
    }
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Login as Admin
    await page.locator("#email").fill(adminEmail);
    await page.locator("#password").fill("testpass123");
    await page.getByRole("button", { name: /sign in|signin|تسجيل/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // Go to admin projects
    await page.goto("/admin/projects");
    await expect(page.getByText(/Projects|المشاريع/i).first()).toBeVisible({ timeout: 10000 });

    // Click on Deleted tab
    await page.getByRole("tab", { name: /deleted/i }).click();

    // Verify project is in deleted list
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 10000 });

    // Find the row and click restore
    const row = page.locator('tr', { hasText: projectName });
    await row.getByRole("button", { name: /restore/i }).click();

    // It should disappear from deleted tab
    await expect(page.getByText(projectName).first()).not.toBeVisible({ timeout: 10000 });

    // Check active tab
    await page.getByRole("tab", { name: /active/i }).click();
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 10000 });
  });
});
