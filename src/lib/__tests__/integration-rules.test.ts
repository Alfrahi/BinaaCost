// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Integration tests against a live PocketBase at VITE_POCKETBASE_URL (or
// http://127.0.0.1:8090). Skips when server is unreachable so unit-only CI
// environments don't fail.

const BASE = process.env.VITE_POCKETBASE_URL || "http://127.0.0.1:8090";

async function api(
  method: string,
  path: string,
  body?: any,
  token?: string,
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function makeUser(email: string, role = "user") {
  const r = await api("POST", "/api/collections/users/records", {
    email,
    password: "testpass123",
    passwordConfirm: "testpass123",
    role,
  });
  if (!r.json?.id) console.log("[MAKEUSER FAIL]", r.status, JSON.stringify(r.json).slice(0,300));
  return r.json.id as string;
}
async function login(email: string, password = "testpass123") {
  const r = await api("POST", "/api/collections/users/auth-with-password", {
    identity: email,
    password,
  });
  return { token: r.json.token as string, id: r.json.record.id as string };
}
async function suToken() {
  const r = await api(
    "POST",
    "/api/collections/_superusers/auth-with-password",
    { identity: "admin@local.dev", password: "localdev123" },
  );
  return r.json.token as string;
}

async function canReachPb(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    return r.ok;
  } catch {
    return false;
  }
}

const REACHABLE = await canReachPb();
const itLive = REACHABLE ? it : it.skip;

describe("pocketbase integration", () => {
  let su: string;
  let uid: string;
  let tok: string;
  let pid: string;
  let adminUid: string;
  let adminTok: string;
  let emailUser: string;
  let emailAdmin: string;
  let emailViewer: string;
  let emailEditor: string;

  beforeAll(async () => {
    if (!REACHABLE) return;
    su = await suToken();
    // unique emails per run — avoids uniqueness clashes from aborted prior runs
    const RUN = String(Date.now());
    emailUser = `it-user-${RUN}@local.dev`;
    emailAdmin = `it-admin-${RUN}@local.dev`;
    emailViewer = `it-viewer-${RUN}@local.dev`;
    emailEditor = `it-editor-${RUN}@local.dev`;

    uid = await makeUser(emailUser);
    const l = await login(emailUser);
    tok = "Bearer " + l.token;

    adminUid = await makeUser(emailAdmin);
    await api("PATCH", `/api/collections/users/records/${adminUid}`, { role: "super_admin" }, "Bearer " + su);
    const la = await login(emailAdmin);
    adminTok = "Bearer " + la.token;

    const p = await api("POST", "/api/collections/projects/records", { name: "IT", currency: "USD", user_id: uid }, tok);
    console.log("CREATE:", JSON.stringify({uid, pStatus: p.status, pbody: p.json}));
    pid = p.json.id;
  });

  afterAll(async () => {
    if (!REACHABLE) return;
    // delete audit rows + project + users
    const logs = await api("GET", "/api/collections/audit_logs/records", undefined, `Bearer ${su}`);
    for (const a of logs.json?.items || []) {
      await api("DELETE", `/api/collections/audit_logs/records/${a.id}`, undefined, `Bearer ${su}`);
    }
    if (pid) await api("DELETE", `/api/collections/projects/records/${pid}`, undefined, tok);
    for (const id of [uid, adminUid]) {
      await api("DELETE", `/api/collections/users/records/${id}`, undefined, `Bearer ${su}`);
    }
  });

  describe("rules matrix", () => {
    itLive("anon cannot list projects", async () => {
      const r = await api("GET", "/api/collections/projects/records");
      expect(r.status).toBe(200); // PB returns empty list (rules), never data
      expect(r.json.items).toEqual([]);
    });

    itLive("anon cannot insert project", async () => {
      const r = await api("POST", "/api/collections/projects/records", {
        name: "anon", currency: "USD", user_id: uid,
      });
      expect([400, 403]).toContain(r.status);
    });

    itLive("user lists only own projects", async () => {
      const r = await api("GET", "/api/collections/projects/records", undefined, tok);
      console.log("LIST:", JSON.stringify({status: r.status, items: r.json.items?.length, uid, tok: !!tok}, null, 0));
      expect(r.json.items.some((p: any) => p.name === "IT" && p.user_id === uid)).toBe(true);
    });

    itLive("viewer cannot edit project", async () => {
      const suLocal = "Bearer " + su;
      const { token: _unusedVTok } = await login(emailUser);
      const viewer = await api("POST", "/api/collections/users/records", {
        email: emailViewer, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, suLocal);
      // no share -> can't edit; with viewer share via role collection
      const pid2 = (await api("POST", "/api/collections/projects/records", {
        name: "Owned by other", currency: "USD", user_id: adminUid,
      }, suLocal)).json.id;
      const lv = await login(emailViewer);
      const vTok = "Bearer " + lv.token;
      const upd = await api("PATCH", `/api/collections/projects/records/${pid2}`, { name: "denied" }, vTok);
      expect(upd.status).toBe(404); // viewRule denies → generic 404, good
      await api("DELETE", `/api/collections/projects/records/${pid2}`, undefined, "Bearer " + su);
      await api("DELETE", `/api/collections/users/records/${viewer.json.id}`, undefined, suLocal);
    });

    itLive("packages: shared editor can edit", async () => {
      // create editor user
      const su_ = "Bearer " + su;
      const editor = await api("POST", "/api/collections/users/records", {
        email: emailEditor, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, su_);
      await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: editor.json.id, shared_with_email: emailEditor, role: "editor",
      }, tok);
      const le = await login(emailEditor);
      const eTok = "Bearer " + le.token;
      const upd = await api("PATCH", `/api/collections/projects/records/${pid}`, { description: "ok" }, eTok);
      expect(upd.status).toBe(200);
      await api("DELETE", `/api/collections/users/records/${editor.json.id}`, undefined, su_);
    });
  });

  describe("simulate golden", () => {
    itLive("server totals match client-side src/logic financials", async () => {
      const { calculateProjectFinancials } = await import(
        "@/logic/financials"
      );

      // create items
      await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "M1", quantity: 10, unit: "m", unit_price: 100 }, tok);
      await api("POST", "/api/collections/labor_items/records",
        { project_id: pid, user_id: uid, worker_type: "Mason", number_of_workers: 2, daily_rate: 100, total_days: 10 }, tok);

      const r = await api("POST", `/api/projects/${pid}/simulate`,
        { scenario: { impact_rules: [] } }, tok);
      if (r.status !== 200) console.log("[SIM FAIL]", r.status, JSON.stringify(r.json).slice(0,300));

      const expected = calculateProjectFinancials(
        { materialsTotal: 1000, laborTotal: 2000, equipmentTotal: 0, additionalTotal: 0 },
        r.json.original.financial_settings,
      );

      expect(r.status).toBe(200);
      expect(r.json.original.financials.grandTotal).toBe(expected.grandTotal);
      expect(r.json.original.financials.bidPrice).toBe(expected.bidPrice);

      // clean-added items for other tests
      const items = await api("GET", `/api/collections/materials/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      for (const i of items.json.items) {
        await api("DELETE", `/api/collections/materials/records/${i.id}`, undefined, tok);
      }
      const items2 = await api("GET", `/api/collections/labor_items/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      for (const i of items2.json.items) {
        await api("DELETE", `/api/collections/labor_items/records/${i.id}`, undefined, tok);
      }
    });
  });

  describe("version round-trip", () => {
    itLive("snapshot captures state; apply restores item rows", async () => {
      await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "SnapMat", quantity: 2, unit: "pc", unit_price: 10 }, tok);

      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "v1" }, tok);
      expect(v.status).toBe(200);
      const vid = v.json.id;

      // mutate + verify
      const mm = await api("GET", `/api/collections/materials/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      await api("PATCH", `/api/collections/materials/records/${mm.json.items[0].id}`, { unit_price: 99 }, tok);

      const snap = (await api("GET", `/api/collections/project_versions/records/${vid}`, undefined, tok)).json;
      const priceBefore = snap.data.materials.find((m: any) => m.name === "SnapMat")!.unit_price;
      expect(priceBefore).toBe(10);

      const r = await api("POST", `/api/versions/${vid}/apply`, { snapshot: snap.data }, tok);
      expect(r.status).toBe(200);

      const after = await api("GET", `/api/collections/materials/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      const restored = after.json.items.find((m: any) => m.name === "SnapMat");
      expect(restored.unit_price).toBe(10);

      await api("DELETE", `/api/collections/materials/records/${restored.id}`, undefined, tok);
      await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
    });
  });

  describe("admin protections on routes", () => {
    itLive("regular user cannot demote/promote", async () => {
      const r = await api("POST", `/api/admin/users/${uid}/role`, { role: "super_admin" }, tok);
      expect([403]).toContain(r.status);
    });
    itLive("non-admin calls blocked", async () => {
      const r = await api("POST", `/api/admin/users/${uid}/role`, { role: "user" }, "Bearer garbage");
      expect(r.status).toBe(403);
    });
    itLive("role change works as super_admin", async () => {
      const r = await api("POST", `/api/admin/users/${uid}/role`, { role: "user" }, adminTok);
      expect(r.status).toBe(200);
    });
  });
});
