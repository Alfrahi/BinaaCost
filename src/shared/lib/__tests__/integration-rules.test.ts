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
        "@/shared/logic/financials"
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

      // clean up the simple items so the awkward-decimal assertions below
      // see ONLY the awkward items (exact-equality check must be isolated)
      const simpleMats = await api("GET", `/api/collections/materials/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      for (const i of simpleMats.json.items) {
        await api("DELETE", `/api/collections/materials/records/${i.id}`, undefined, tok);
      }
      const simpleLabor = await api("GET", `/api/collections/labor_items/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      for (const i of simpleLabor.json.items) {
        await api("DELETE", `/api/collections/labor_items/records/${i.id}`, undefined, tok);
      }

      // items with awkward decimals — exact equality, not approximate
      await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "AwkM1", quantity: 3, unit: "kg", unit_price: 33.335 }, tok);
      await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "AwkM2", quantity: 0.1, unit: "kg", unit_price: 0.2 }, tok);
      await api("POST", "/api/collections/labor_items/records",
        { project_id: pid, user_id: uid, worker_type: "Welder", number_of_workers: 1, daily_rate: 33.335, total_days: 2 }, tok);

      const r2 = await api("POST", `/api/projects/${pid}/simulate`,
        { scenario: { impact_rules: [] } }, tok);
      expect(r2.status).toBe(200);

      // M7: server totals must be EXACTLY equal (not close) to client totals
      const { calculateProjectFinancials: calc2 } = await import("@/shared/logic/financials");
      const { calculateCategoryTotal: ct2 } = await import("@/shared/logic/shared");
      const matItems2 = [
        { quantity: 3, unit_price: 33.335 },
        { quantity: 0.1, unit_price: 0.2 },
      ];
      const labItems2 = [
        { number_of_workers: 1, daily_rate: 33.335, total_days: 2 },
      ];
      const expected2 = calc2(
        {
          materialsTotal: ct2.materials(matItems2),
          laborTotal: ct2.labor(labItems2),
          equipmentTotal: 0,
          additionalTotal: 0,
        },
        r2.json.original.financial_settings,
      );
      expect(r2.json.original.financials.directCosts).toBe(expected2.directCosts);
      expect(r2.json.original.financials.grandTotal).toBe(expected2.grandTotal);
      expect(r2.json.original.financials.taxAmount).toBe(expected2.taxAmount);

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

    itLive("DATA-001: restore maps old group_id to newly generated group_id", async () => {
      // 1. Create a group
      const grp = await api("POST", "/api/collections/project_groups/records", {
        project_id: pid, user_id: uid, name: "Foundation Group", sort_order: 1,
      }, tok);
      const oldGroupId = grp.json.id;

      // 2. Create a material linked to that group
      const mat = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, group_id: oldGroupId, name: "Cement", quantity: 50, unit: "bag", unit_price: 15,
      }, tok);

      // 3. Take snapshot
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "v-groups" }, tok);
      const vid = v.json.id;

      // 4. Apply the version (which deletes old groups and recreates them)
      const applyRes = await api("POST", `/api/versions/${vid}/apply`, {}, tok);
      expect(applyRes.status).toBe(200);

      // 5. Query restored groups and materials
      const groupsRes = await api("GET", `/api/collections/project_groups/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      const materialsRes = await api("GET", `/api/collections/materials/records?filter=project_id%3D%22${pid}%22`, undefined, tok);

      const restoredGroup = groupsRes.json.items.find((g: any) => g.name === "Foundation Group");
      const restoredMat = materialsRes.json.items.find((m: any) => m.name === "Cement");

      expect(restoredGroup).toBeDefined();
      expect(restoredMat).toBeDefined();
      // Crucial assertion: group_id must NOT be orphaned, it must match the NEW group id!
      expect(restoredMat.group_id).toBe(restoredGroup.id);
      expect(restoredMat.group_id).not.toBe(oldGroupId);

      // Cleanup
      await api("DELETE", `/api/collections/materials/records/${restoredMat.id}`, undefined, tok);
      await api("DELETE", `/api/collections/project_groups/records/${restoredGroup.id}`, undefined, tok);
      await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
    });
  });

  describe("M6: version apply + concurrency", () => {
    itLive("apply with create_rollback=true creates a rollback snapshot", async () => {
      await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "M6Mat", quantity: 1, unit: "pc", unit_price: 5 }, tok);

      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "m6-v1" }, tok);
      const vid = v.json.id;

      // count versions before
      const before = await api("GET", `/api/collections/project_versions/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      const beforeCount = before.json.items.length;

      const r = await api("POST", `/api/versions/${vid}/apply`,
        { create_rollback: true }, tok);
      expect(r.status).toBe(200);

      const after = await api("GET", `/api/collections/project_versions/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      expect(after.json.items.length).toBe(beforeCount + 1);
      const rollback = after.json.items.find((x: any) => x.name === "Rollback before apply");
      expect(rollback).toBeTruthy();

      // cleanup
      for (const x of after.json.items) {
        await api("DELETE", `/api/collections/project_versions/records/${x.id}`, undefined, tok);
      }
      const mats = await api("GET", `/api/collections/materials/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      for (const m of mats.json.items) {
        await api("DELETE", `/api/collections/materials/records/${m.id}`, undefined, tok);
      }
    });

    itLive("stale project update (mismatched updated) is rejected with 409", async () => {
      const p = await api("GET", `/api/collections/projects/records/${pid}`, undefined, tok);
      const currentUpdated = p.json.updated;

      // first update succeeds (no updated guard sent)
      const ok = await api("PATCH", `/api/collections/projects/records/${pid}`,
        { description: "first" }, tok);
      expect(ok.status).toBe(200);

      // second update with the STALE updated timestamp → 409
      const stale = await api("PATCH", `/api/collections/projects/records/${pid}`,
        { description: "second", updated: currentUpdated }, tok);
      expect(stale.status).toBe(409);
    });

    itLive("apply ignores forged snapshot with mismatched project_id", async () => {
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "m6-v2" }, tok);
      const vid = v.json.id;

      const forged = { project_id: "some-other-project", materials: [] };
      const r = await api("POST", `/api/versions/${vid}/apply`,
        { snapshot: forged }, tok);
      expect(r.status).toBe(400);

      await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
    });
  });

  describe("M7: convert_currency rate guard", () => {
    itLive("missing/zero currency rate is rejected with 400 and DB untouched", async () => {
      // insert a material to verify no side-effects
      const m = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "GuardMat", quantity: 1, unit: "pc", unit_price: 42,
      }, tok);
      const matId = m.json.id;

      // a currency code with no rate record (PB rejects rate_to_usd=0 as
      // "blank" for the required number field, so a missing code is the
      // realistic trigger for the guard)
      const r = await api("POST", `/api/projects/${pid}/convert-currency`,
        { old_currency: "USD", new_currency: "NOSUCH" }, tok);
      expect(r.status).toBe(400);

      // material row unchanged
      const after = await api("GET", `/api/collections/materials/records/${matId}`, undefined, tok);
      expect(after.json.unit_price).toBe(42);

      // cleanup
      await api("DELETE", `/api/collections/materials/records/${matId}`, undefined, tok);
    });

    itLive("DATA-002: convert-currency recalculates labor and equipment total_cost", async () => {
      // Create a dedicated test project
      const p = await api("POST", "/api/collections/projects/records", {
        name: "Currency Test Project",
        currency: "USD",
        user_id: uid,
      }, tok);
      const testPid = p.json.id;

      // 1. Create a labor item: 2 workers, 100 daily_rate, 5 days -> total_cost = 1000
      const labor = await api("POST", "/api/collections/labor_items/records", {
        project_id: testPid,
        user_id: uid,
        worker_type: "Carpenter",
        number_of_workers: 2,
        daily_rate: 100,
        total_days: 5,
        total_cost: 1000,
      }, tok);
      const laborId = labor.json.id;

      // 2. Create an equipment item: 2 qty, 100 cost_per_period, 3 duration, 50 maint, 50 fuel -> total_cost = 700
      const eq = await api("POST", "/api/collections/equipment_items/records", {
        project_id: testPid,
        user_id: uid,
        name: "Excavator",
        quantity: 2,
        cost_per_period: 100,
        usage_duration: 3,
        maintenance_cost: 50,
        fuel_cost: 50,
        total_cost: 700,
      }, tok);
      const eqId = eq.json.id;

      // 3. Convert USD -> EUR (rate factor = 0.92 / 1.0 = 0.92)
      const conv = await api("POST", `/api/projects/${testPid}/convert-currency`, {
        old_currency: "USD",
        new_currency: "EUR",
      }, tok);
      expect(conv.status).toBe(200);
      expect(conv.json.factor).toBe(0.92);

      // 4. Verify labor: daily_rate = 92, total_cost = 2 * 92 * 5 = 920
      const laborAfter = await api("GET", `/api/collections/labor_items/records/${laborId}`, undefined, tok);
      expect(laborAfter.json.daily_rate).toBe(92);
      expect(laborAfter.json.total_cost).toBe(920);

      // 5. Verify equipment: cost_per_period = 92, maintenance_cost = 46, fuel_cost = 46, total_cost = (2*92*3) + 46 + 46 = 644
      const eqAfter = await api("GET", `/api/collections/equipment_items/records/${eqId}`, undefined, tok);
      expect(eqAfter.json.cost_per_period).toBe(92);
      expect(eqAfter.json.maintenance_cost).toBe(46);
      expect(eqAfter.json.fuel_cost).toBe(46);
      expect(eqAfter.json.total_cost).toBe(644);

      // 6. Verify project currency updated
      const projAfter = await api("GET", `/api/collections/projects/records/${testPid}`, undefined, tok);
      expect(projAfter.json.currency).toBe("EUR");

      // Cleanup
      await api("DELETE", `/api/collections/labor_items/records/${laborId}`, undefined, tok);
      await api("DELETE", `/api/collections/equipment_items/records/${eqId}`, undefined, tok);
      await api("DELETE", `/api/collections/projects/records/${testPid}`, undefined, tok);
    });
  });

  describe("H4: child collection ownership binding", () => {
    let editorId: string;
    let editorTok: string;

    beforeAll(async () => {
      if (!REACHABLE) return;
      const RUN = String(Date.now());
      const email = `it-h4-${RUN}@local.dev`;
      const ed = await api("POST", "/api/collections/users/records", {
        email, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, "Bearer " + su);
      editorId = ed.json.id;
      await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: editorId, shared_with_email: email, role: "editor",
      }, tok);
      const le = await login(email);
      editorTok = "Bearer " + le.token;
    });

    afterAll(async () => {
      if (!REACHABLE || !editorId) return;
      const fake = await api("GET",
        `/api/collections/comments/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      for (const c of fake.json.items || []) {
        await api("DELETE", `/api/collections/comments/records/${c.id}`, undefined, tok);
      }
      await api("DELETE", `/api/collections/users/records/${editorId}`, undefined, "Bearer " + su);
    });

    itLive("editor cannot create comment spoofing another user's id", async () => {
      const r = await api("POST", "/api/collections/comments/records", {
        project_id: pid, user_id: uid, content: "impersonated",
      }, editorTok);
      expect([400, 403]).toContain(r.status);
    });

    itLive("editor creates comment with own id normally", async () => {
      const r = await api("POST", "/api/collections/comments/records", {
        project_id: pid, user_id: editorId, content: "real comment",
      }, editorTok);
      expect(r.status).toBe(200);
      expect(r.json.user_id).toBe(editorId);
    });

    itLive("owner cannot reassign material user_id on update", async () => {
      const m = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "H4Mat", quantity: 1, unit: "pc", unit_price: 5,
      }, tok);
      const upd = await api("PATCH", `/api/collections/materials/records/${m.json.id}`, {
        user_id: editorId,
      }, tok);
      expect([400, 403, 404]).toContain(upd.status);
      const sane = await api("PATCH", `/api/collections/materials/records/${m.json.id}`, {
        unit_price: 7,
      }, tok);
      expect(sane.status).toBe(200);
      await api("DELETE", `/api/collections/materials/records/${m.json.id}`, undefined, tok);
    });

    itLive("editor cannot reassign project user_id on update (SEC-001)", async () => {
      const upd = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        user_id: editorId,
      }, editorTok);
      expect([400, 403, 404]).toContain(upd.status);
    });
  });

  describe("H3: users directory restricted", () => {
    itLive("non-admin listing users sees only own record", async () => {
      const r = await api("GET", "/api/collections/users/records", undefined, tok);
      const ids = (r.json.items || []).map((u: any) => u.id);
      expect(ids).toContain(uid);
      expect(ids).not.toContain(adminUid);
      expect(r.json.items.length).toBe(1);
    });

    itLive("admin can list users", async () => {
      const r = await api("GET", "/api/collections/users/records?perPage=100", undefined, adminTok);
      const ids = (r.json.items || []).map((u: any) => u.id);
      expect(ids).toContain(uid);
      expect(ids).toContain(adminUid);
    });

    itLive("/api/users/minimal scopes to collaborators and returns only display fields (SEC-005)", async () => {
      // 1. Non-admin caller querying self and an unrelated user only gets self (unrelated user is omitted)
      const rUser = await api("POST", "/api/users/minimal", { ids: [uid, adminUid] }, tok);
      expect(rUser.status).toBe(200);
      expect(Array.isArray(rUser.json)).toBe(true);
      expect(rUser.json).toHaveLength(1);
      expect(rUser.json[0].id).toBe(uid);
      expect(Object.keys(rUser.json[0]).sort()).toEqual(["email", "first_name", "id", "last_name"]);

      // 2. Admin caller can query arbitrary users
      const rAdmin = await api("POST", "/api/users/minimal", { ids: [uid, adminUid] }, adminTok);
      expect(rAdmin.status).toBe(200);
      expect(rAdmin.json).toHaveLength(2);
    });

    itLive("/api/users/minimal caps at 100 ids", async () => {
      const r = await api("POST", "/api/users/minimal",
        { ids: Array.from({ length: 101 }, (_, i) => `x${i}`) }, tok);
      expect(r.status).toBe(400);
    });

    itLive("/api/users/minimal requires auth", async () => {
      const r = await api("POST", "/api/users/minimal", { ids: [uid] });
      expect(r.status).toBe(401);
    });
  });

  describe("M4/M3: share link hardening", () => {
    const future = () => new Date(Date.now() + 86400000).toISOString();

    itLive("password shorter than 8 chars is rejected", async () => {
      const r = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: future(), password: "abc" }, tok);
      expect(r.status).toBe(400);
    });

    itLive("past expires_at is rejected", async () => {
      const r = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: new Date(Date.now() - 1000).toISOString(), password: "goodpass123" }, tok);
      expect(r.status).toBe(400);
    });

    itLive("20 wrong passwords allowed, 21st returns 429; success before cap", async () => {
      const link = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: future(), password: "correct-horse-9" }, tok);
      expect(link.status).toBe(200);
      const token = link.json.access_token;

      for (let i = 0; i < 5; i++) {
        const r = await api("POST", `/api/share/${token}`, { password: "wrong-pass" });
        expect(r.status).toBe(403);
      }
      // successful auth still works mid-window (not counted as failure)
      const ok = await api("POST", `/api/share/${token}`, { password: "correct-horse-9" });
      expect(ok.status).toBe(200);

      for (let i = 0; i < 15; i++) {
        const r = await api("POST", `/api/share/${token}`, { password: "wrong-pass" });
        expect(r.status).toBe(403);
      }
      // 21st failure blocked
      const over = await api("POST", `/api/share/${token}`, { password: "wrong-pass" });
      expect(over.status).toBe(429);

      await api("DELETE", `/api/collections/shared_project_links/records/${link.json.id}`, undefined, tok);
    });

    itLive("deleting an editor share removes editor-created links, owner links survive", async () => {
      // share project with an editor
      const RUN = String(Date.now());
      const email = `it-m3-${RUN}@local.dev`;
      const ed = await makeUser(email);
      const share = await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: ed, shared_with_email: email, role: "editor",
      }, tok);
      const le = await login(email);
      const eTok = "Bearer " + le.token;

      // both create links
      const edLink = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: future(), password: "editorpass1" }, eTok);
      const ownLink = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: future(), password: "ownerpass1" }, tok);

      // revoke the share
      await api("DELETE", `/api/collections/project_shares/records/${share.json.id}`, undefined, tok);

      const edCheck = await api("POST", `/api/share/${edLink.json.access_token}`, { password: "editorpass1" });
      expect(edCheck.status).toBe(404);
      const ownCheck = await api("POST", `/api/share/${ownLink.json.access_token}`, { password: "ownerpass1" });
      expect(ownCheck.status).toBe(200);

      await api("DELETE", `/api/collections/shared_project_links/records/${ownLink.json.id}`, undefined, tok);
      await api("DELETE", `/api/collections/users/records/${ed}`, undefined, "Bearer " + su);
    });
  });

  describe("T1: authz matrix", () => {
    itLive("user B cannot read/write user A's version snapshots", async () => {
      // owner creates a version snapshot
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "authz-v1" }, tok);
      expect(v.status).toBe(200);
      const vid = v.json.id;

      // a second, unrelated user
      const RUN = String(Date.now());
      const emailB = `it-authz-b-${RUN}@local.dev`;
      const bId = await makeUser(emailB);
      const lb = await login(emailB);
      const bTok = "Bearer " + lb.token;

      // B cannot read the version (viewRule denies → 404)
      const read = await api("GET", `/api/collections/project_versions/records/${vid}`, undefined, bTok);
      expect(read.status).toBe(404);

      // B cannot update the version
      const write = await api("PATCH", `/api/collections/project_versions/records/${vid}`, { name: "hijacked" }, bTok);
      expect([400, 403, 404]).toContain(write.status);

      await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
      await api("DELETE", `/api/collections/users/records/${bId}`, undefined, "Bearer " + su);
    });

    itLive("editor cannot create share links after their share is removed", async () => {
      const RUN = String(Date.now());
      const email = `it-authz-ed-${RUN}@local.dev`;
      const edId = await makeUser(email);
      const share = await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: edId, shared_with_email: email, role: "editor",
      }, tok);
      const le = await login(email);
      const eTok = "Bearer " + le.token;

      // while shared, editor CAN create a link
      const before = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: new Date(Date.now() + 86400000).toISOString(), password: "editorpass1" }, eTok);
      expect(before.status).toBe(200);

      // remove the share
      await api("DELETE", `/api/collections/project_shares/records/${share.json.id}`, undefined, tok);

      // now editor CANNOT create a link
      const after = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: new Date(Date.now() + 86400000).toISOString(), password: "editorpass2" }, eTok);
      expect(after.status).toBe(403);

      await api("DELETE", `/api/collections/shared_project_links/records/${before.json.id}`, undefined, tok);
      await api("DELETE", `/api/collections/users/records/${edId}`, undefined, "Bearer " + su);
    });

    itLive("viewer share CAN simulate (intended: simulate allowed for shares)", async () => {
      // DESIGN DECISION: simulate is allowed for any share (viewer or editor),
      // not just owners. Encode and assert the intended rule.
      const RUN = String(Date.now());
      const email = `it-authz-vw-${RUN}@local.dev`;
      const vwId = await makeUser(email);
      await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: vwId, shared_with_email: email, role: "viewer",
      }, tok);
      const lv = await login(email);
      const vTok = "Bearer " + lv.token;

      const r = await api("POST", `/api/projects/${pid}/simulate`,
        { scenario: { impact_rules: [] } }, vTok);
      expect(r.status).toBe(200);

      await api("DELETE", `/api/collections/users/records/${vwId}`, undefined, "Bearer " + su);
    });

    itLive("non-owner cannot delete shared_project_links of others", async () => {
      // owner creates a link
      const link = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: new Date(Date.now() + 86400000).toISOString(), password: "ownerpass1" }, tok);
      expect(link.status).toBe(200);

      // a second, unrelated user attempts to delete it
      const RUN = String(Date.now());
      const emailB = `it-authz-del-${RUN}@local.dev`;
      const bId = await makeUser(emailB);
      const lb = await login(emailB);
      const bTok = "Bearer " + lb.token;

      const del = await api("DELETE", `/api/collections/shared_project_links/records/${link.json.id}`, undefined, bTok);
      expect([400, 403, 404]).toContain(del.status);

      // link still exists (owner can still read it)
      const still = await api("GET", `/api/collections/shared_project_links/records/${link.json.id}`, undefined, tok);
      expect(still.status).toBe(200);

      await api("DELETE", `/api/collections/shared_project_links/records/${link.json.id}`, undefined, tok);
      await api("DELETE", `/api/collections/users/records/${bId}`, undefined, "Bearer " + su);
    });
  });

  describe("A1: audit trail field-diff", () => {
    itLive("update writes an audit_logs row with only the changed field in new_data", async () => {
      // create a material, then update a single field
      const m = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "AuditMat", quantity: 1, unit: "pcs", unit_price: 10,
      }, tok);
      expect(m.status).toBe(200);
      const matId = m.json.id;

      await api("PATCH", `/api/collections/materials/records/${matId}`, { quantity: 5 }, tok);

      // fetch the audit rows for this material (superuser can list audit_logs)
      const logs = await api(
        "GET",
        `/api/collections/audit_logs/records?filter=record_id%3D%22${matId}%22&sort=created`,
        undefined,
        "Bearer " + su,
      );
      expect(logs.status).toBe(200);
      const items = logs.json.items || [];
      const updateRow = items.find((a: any) => a.action === "UPDATE");
      expect(updateRow).toBeTruthy();

      // new_data carries the changed field only (quantity), not the whole record
      expect(updateRow.new_data).toHaveProperty("quantity", 5);
      expect(updateRow.new_data).not.toHaveProperty("name");
      expect(updateRow.new_data).not.toHaveProperty("unit_price");

      // old_data carries the prior value of the changed field
      expect(updateRow.old_data).toHaveProperty("quantity", 1);

      // no sensitive fields ever logged
      const serialized = JSON.stringify(updateRow);
      expect(serialized).not.toMatch(/password|token|secret|hash/i);

      await api("DELETE", `/api/collections/materials/records/${matId}`, undefined, tok);
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
