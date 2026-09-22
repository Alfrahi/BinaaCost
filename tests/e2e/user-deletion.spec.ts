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

test.describe("user soft-deletion lifecycle", () => {
  let suToken = "";
  let emailA = "";
  let uidA = "";
  let pidA = "";

  test.beforeAll(async ({ request }) => {
    const h = await request.get(`${BASE}/api/health`);
    if (!h.ok()) return;

    // 1. Authenticate as superuser
    const su = await api(request, "POST", "/api/collections/_superusers/auth-with-password", {
      identity: "admin@local.dev", password: "localdev123",
    });
    suToken = su.json?.token;

    // 2. Create User A
    emailA = `del-user-${Date.now()}@local.dev`;
    const ua = await api(request, "POST", "/api/collections/users/records", {
      email: emailA, password: "testpass123", passwordConfirm: "testpass123", role: "user",
    }, `Bearer ${suToken}`);
    uidA = ua.json.id;

    // 3. User A creates a project
    const p = await api(request, "POST", "/api/collections/projects/records", {
      name: `Proj A ${Date.now()}`, currency: "USD", user_id: uidA, version: 1,
    }, `Bearer ${suToken}`); // Admin can create for user, or use user token.
    console.log("Project creation response:", p.json); pidA = p.json?.id;
  });

  test("deleting user soft-deletes and preserves projects", async ({ request }) => {
    if (!suToken) test.skip();

    // Verify project exists
    let pCheck = await api(request, "GET", `/api/collections/projects/records/${pidA}`, undefined, `Bearer ${suToken}`);
    expect(pCheck.status).toBe(200);

    // Delete User A via Admin
    const delRes = await api(request, "DELETE", `/api/collections/users/records/${uidA}`, undefined, `Bearer ${suToken}`);
    expect(delRes.status).toBe(204);

    // Verify User A is soft-deleted
    const uCheck = await api(request, "GET", `/api/collections/users/records/${uidA}`, undefined, `Bearer ${suToken}`);
    expect(uCheck.status).toBe(200); // Should still exist
    expect(uCheck.json.deleted_at).toBeTruthy(); // soft-deleted flag set

    // Verify project STILL exists (not orphaned via cascade)
    pCheck = await api(request, "GET", `/api/collections/projects/records/${pidA}`, undefined, `Bearer ${suToken}`);
    expect(pCheck.status).toBe(200);
    expect(pCheck.json.user_id).toBe(uidA);
  });
});
