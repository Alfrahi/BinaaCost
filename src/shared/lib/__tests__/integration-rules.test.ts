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
  if (method === "PATCH" && path.includes("/records/") && body && body.version === undefined) {
    const getRes = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {}),
      },
    });
    if (getRes.ok) {
      const existing = await getRes.json();
      if (existing && existing.version !== undefined) {
        body.version = existing.version;
      }
    }
  }

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

      // items with awkward decimals — exact equality, not approximate (now using cents)
      await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "AwkM1", quantity: 3, unit: "kg", unit_price: 3334 }, tok);
      await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "AwkM2", quantity: 0.1, unit: "kg", unit_price: 20 }, tok);
      await api("POST", "/api/collections/labor_items/records",
        { project_id: pid, user_id: uid, worker_type: "Welder", number_of_workers: 1, daily_rate: 3334, total_days: 2 }, tok);

      const r2 = await api("POST", `/api/projects/${pid}/simulate`,
        { scenario: { impact_rules: [] } }, tok);
      expect(r2.status).toBe(200);

      // M7: server totals must be EXACTLY equal (not close) to client totals
      const { calculateProjectFinancials: calc2 } = await import("@/shared/logic/financials");
      const { calculateCategoryTotal: ct2 } = await import("@/shared/logic/shared");
      const matItems2 = [
        { quantity: 3, unit_price: 3334 },
        { quantity: 0.1, unit_price: 20 },
      ];
      const labItems2 = [
        { number_of_workers: 1, daily_rate: 3334, total_days: 2 },
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

    itLive("FIN-02: simulation applies location_factor and risk contingency correctly", async () => {
      const patchFin = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        financial_settings: {
          overhead_percent: 10,
          markup_percent: 10,
          tax_percent: 0,
          contingency_percent: 5,
          contingency_basis: "combined",
          location_factor: 1.20,
        },
      }, tok);
      expect(patchFin.status).toBe(200);

      const m = await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "FinMat", quantity: 10, unit: "pc", unit_price: 50 }, tok);
      const risk = await api("POST", "/api/collections/risks/records",
        { project_id: pid, user_id: uid, description: "Delay Risk", probability: "high", impact_amount: 1000 }, tok);

      const simRes = await api("POST", `/api/projects/${pid}/simulate`, {
        scenario: {
          impact_rules: [
            {
              item_type: "financial_settings",
              field: "location_factor",
              adjustment_type: "fixed_increase",
              value: 0.10,
            },
          ],
        },
      }, tok);

      expect(simRes.status).toBe(200);
      const origFin = simRes.json.original.financials;
      expect(origFin.directCostsBase).toBe(500);
      expect(origFin.directCosts).toBe(600);
      expect(origFin.locationAdjustmentAmount).toBe(100);
      expect(origFin.overheadAmount).toBe(60);
      expect(origFin.flatContingencyAmount).toBe(30);
      expect(origFin.riskContingencyAmount).toBe(300);
      expect(origFin.contingencyAmount).toBe(330);
      expect(origFin.contingencyBasis).toBe("combined");
      expect(origFin.primeCost).toBe(990);
      expect(origFin.markupAmount).toBe(99);
      expect(origFin.grandTotal).toBe(1089);

      const simFin = simRes.json.simulated.financials;
      expect(simFin.directCostsBase).toBe(500);
      expect(simFin.directCosts).toBe(650);
      expect(simFin.locationAdjustmentAmount).toBe(150);
      expect(simFin.overheadAmount).toBe(65);
      expect(simFin.flatContingencyAmount).toBe(33);
      expect(simFin.riskContingencyAmount).toBe(300);
      expect(simFin.contingencyAmount).toBe(333);
      expect(simFin.primeCost).toBe(1048);
      expect(simFin.markupAmount).toBe(105);
      expect(simFin.bidPrice).toBe(1153);
      expect(simFin.taxAmount).toBe(0);
      expect(simFin.grandTotal).toBe(1153);
      await api("DELETE", `/api/collections/materials/records/${m.json.id}`, undefined, tok);
      await api("DELETE", `/api/collections/risks/records/${risk.json.id}`, undefined, tok);
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
      await api("POST", "/api/collections/materials/records", {
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

    itLive("HIST-01: version creation freezes summary and financials onto snapshot data", async () => {
      await api("PATCH", `/api/collections/projects/records/${pid}`, {
        financial_settings: {
          overhead_percent: 10,
          markup_percent: 20,
          tax_percent: 5,
          contingency_percent: 5,
          location_factor: 1,
        },
      }, tok);

      const m = await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "FrozenMat", quantity: 10, unit: "pc", unit_price: 20 }, tok);
      const l = await api("POST", "/api/collections/labor_items/records",
        { project_id: pid, user_id: uid, worker_type: "Carpenter", number_of_workers: 2, daily_rate: 100, total_days: 3 }, tok);

      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "v-frozen" }, tok);
      expect(v.status).toBe(200);
      const vid = v.json.id;

      const vRec = await api("GET", `/api/collections/project_versions/records/${vid}`, undefined, tok);
      expect(vRec.status).toBe(200);
      const data = vRec.json.data;

      expect(data).toHaveProperty("summary");
      expect(data.summary.materials).toBe(200);
      expect(data.summary.labor).toBe(600);
      expect(data.summary.equipment).toBe(0);
      expect(data.summary.additional).toBe(0);
      expect(data.summary.directTotal).toBe(800);

      expect(data).toHaveProperty("financials");
      expect(data.financials.directCosts).toBe(800);
      expect(data.financials.overheadAmount).toBe(80);
      expect(data.financials.contingencyAmount).toBe(40);
      expect(data.financials.primeCost).toBe(920);
      expect(data.financials.markupAmount).toBe(184);
      expect(data.financials.bidPrice).toBe(1104);
      expect(data.financials.taxAmount).toBe(55);
      expect(data.financials.grandTotal).toBe(1159);

      await api("DELETE", `/api/collections/materials/records/${m.json.id}`, undefined, tok);
      await api("DELETE", `/api/collections/labor_items/records/${l.json.id}`, undefined, tok);
      await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
    });

    itLive("HIST-03: finalized versions cannot be deleted by owner or super_admin", async () => {
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "v-to-finalize" }, tok);
      expect(v.status).toBe(200);
      const vid = v.json.id;

      const fin = await api("POST", `/api/versions/${vid}/finalize`, {}, tok);
      expect(fin.status).toBe(200);
      expect(fin.json.is_final).toBe(true);

      const delOwner = await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
      expect([400, 403, 404]).toContain(delOwner.status);

      const delAdmin = await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, adminTok);
      expect([400, 403, 404]).toContain(delAdmin.status);

      const check = await api("GET", `/api/collections/project_versions/records/${vid}`, undefined, tok);
      expect(check.status).toBe(200);
      expect(check.json.is_final).toBe(true);
    });

    itLive("SEC-P0: finalized versions cannot be modified via PATCH", async () => {
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "v-to-finalize-immut" }, tok);
      expect(v.status).toBe(200);
      const vid = v.json.id;

      const fin = await api("POST", `/api/versions/${vid}/finalize`, {}, tok);
      expect(fin.status).toBe(200);

      // Attempt to rename / modify the finalized version via PATCH
      const patchRes = await api("PATCH", `/api/collections/project_versions/records/${vid}`, { name: "tampered" }, tok);
      expect([400, 403, 404]).toContain(patchRes.status);

      const check = await api("GET", `/api/collections/project_versions/records/${vid}`, undefined, tok);
      expect(check.json.name).toBe("v-to-finalize-immut");
    });

    itLive("SEC-P0: shared editor can list and view project versions", async () => {
      // 1. Create a version as owner
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "shared-v1" }, tok);
      expect(v.status).toBe(200);
      const vid = v.json.id;

      // 2. Share project with editor
      const su_ = "Bearer " + su;
      const editorEmail = `editor-v-${Date.now()}@local.dev`;
      const editor = await api("POST", "/api/collections/users/records", {
        email: editorEmail, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, su_);
      await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: editor.json.id, shared_with_email: editorEmail, role: "editor",
      }, tok);

      const le = await login(editorEmail);
      const eTok = "Bearer " + le.token;

      // 3. Editor should be able to view and list project_versions
      const listRes = await api("GET", `/api/collections/project_versions/records?filter=project_id%3D%22${pid}%22`, undefined, eTok);
      expect(listRes.status).toBe(200);
      expect(listRes.json.items.some((item: any) => item.id === vid)).toBe(true);

      const viewRes = await api("GET", `/api/collections/project_versions/records/${vid}`, undefined, eTok);
      expect(viewRes.status).toBe(200);
      expect(viewRes.json.id).toBe(vid);

      // Cleanup
      await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
      await api("DELETE", `/api/collections/users/records/${editor.json.id}`, undefined, su_);
    });

    itLive("SEC-P0: child item theft via project_id mutation is rejected", async () => {
      // 1. Create a material in pid
      const m = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "TheftTargetMat", quantity: 10, unit: "kg", unit_price: 5,
      }, tok);
      expect(m.status).toBe(200);
      const matId = m.json.id;

      // 2. Create another project pid2
      const p2 = await api("POST", "/api/collections/projects/records", {
        name: "Attacker Project", user_id: uid, currency: "USD",
      }, tok);
      expect(p2.status).toBe(200);
      const pid2 = p2.json.id;

      // 3. Attempt to PATCH material to change project_id to pid2
      const theftAttempt = await api("PATCH", `/api/collections/materials/records/${matId}`, {
        project_id: pid2,
      }, tok);
      expect([400, 403, 404]).toContain(theftAttempt.status);

      // 4. Verify material project_id remains unchanged
      const verifyMat = await api("GET", `/api/collections/materials/records/${matId}`, undefined, tok);
      expect(verifyMat.json.project_id).toBe(pid);

      // Cleanup
      await api("DELETE", `/api/collections/materials/records/${matId}`, undefined, tok);
      await api("DELETE", `/api/collections/projects/records/${pid2}`, undefined, tok);
    });

    itLive("stale project update (mismatched version) is rejected with 409", async () => {
      const p = await api("GET", `/api/collections/projects/records/${pid}`, undefined, tok);
      const currentVersion = p.json.version;

      // first update succeeds (auto version fetched)
      const ok = await api("PATCH", `/api/collections/projects/records/${pid}`,
        { description: "first" }, tok);
      expect(ok.status).toBe(200);

      // second update with the STALE version → 409
      const stale = await api("PATCH", `/api/collections/projects/records/${pid}`,
        { description: "second", version: currentVersion }, tok);
      expect(stale.status).toBe(409);
    });

    itLive("P1-OCC: stale child item update (mismatched version) is rejected with 409", async () => {
      // 1. Create a material
      const m = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "OccMat", quantity: 1, unit: "pc", unit_price: 10, version: 1
      }, tok);
      expect(m.status).toBe(200);
      const matId = m.json.id;
      const initialVersion = m.json.version;

      // 2. First update succeeds (auto version)
      const upd1 = await api("PATCH", `/api/collections/materials/records/${matId}`, {
        quantity: 2,
      }, tok);
      expect(upd1.status).toBe(200);

      // 3. Second update sending stale initialVersion must fail with 409
      const staleUpd = await api("PATCH", `/api/collections/materials/records/${matId}`, {
        quantity: 3,
        version: initialVersion,
      }, tok);
      expect(staleUpd.status).toBe(409);

      // Cleanup
      await api("DELETE", `/api/collections/materials/records/${matId}`, undefined, tok);
    });

    itLive("P1-DATA: negative numbers rejected by database-level min: 0 constraints", async () => {
      // 1. Negative material unit_price
      const negMat = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "NegMat", quantity: 5, unit: "pcs", unit_price: -10,
      }, tok);
      expect(negMat.status).toBe(400);

      // 2. Negative material quantity
      const negQty = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "NegQtyMat", quantity: -2, unit: "pcs", unit_price: 10,
      }, tok);
      expect(negQty.status).toBe(400);

      // 3. Negative labor daily_rate
      const negLabor = await api("POST", "/api/collections/labor_items/records", {
        project_id: pid, user_id: uid, worker_type: "Carpenter", daily_rate: -150,
      }, tok);
      expect(negLabor.status).toBe(400);

      // 4. Negative additional_costs amount
      const negAdd = await api("POST", "/api/collections/additional_costs/records", {
        project_id: pid, user_id: uid, category: "Permits", amount: -500,
      }, tok);
      expect(negAdd.status).toBe(400);

      // 5. Zero and positive values succeed
      const validMat = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "ValidZeroPriceMat", quantity: 1, unit: "pcs", unit_price: 0,
      }, tok);
      expect(validMat.status).toBe(200);
      await api("DELETE", `/api/collections/materials/records/${validMat.json.id}`, undefined, tok);
    });

    itLive("P1-DATA: duplicate (database_id, csi_code) rejected by database unique index", async () => {
      // 1. Create a cost database
      const db = await api("POST", "/api/collections/cost_databases/records", {
        name: "UniqueIndexDB", user_id: uid, currency: "USD",
      }, tok);
      expect(db.status).toBe(200);
      const dbId = db.json.id;

      // 2. Insert item 1
      const item1 = await api("POST", "/api/collections/cost_database_items/records", {
        database_id: dbId, user_id: uid, csi_code: "03-30-00", description: "Concrete", unit: "cy", unit_price: 120,
      }, tok);
      expect(item1.status).toBe(200);

      // 3. Insert duplicate item with identical (database_id, csi_code)
      const item2 = await api("POST", "/api/collections/cost_database_items/records", {
        database_id: dbId, user_id: uid, csi_code: "03-30-00", description: "Duplicate Concrete", unit: "cy", unit_price: 130,
      }, tok);
      expect(item2.status).toBe(400);

      // Cleanup
      await api("DELETE", `/api/collections/cost_database_items/records/${item1.json.id}`, undefined, tok);
      await api("DELETE", `/api/collections/cost_databases/records/${dbId}`, undefined, tok);
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

    itLive("CRIT-03: apply ignores arbitrary injected snapshot payload and applies stored snapshot", async () => {
      // 1. Create a genuine material and take a version snapshot
      const origMat = await api("POST", "/api/collections/materials/records",
        { project_id: pid, user_id: uid, name: "AuthenticMat", quantity: 5, unit: "bag", unit_price: 20 }, tok);
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "authentic-v1" }, tok);
      const vid = v.json.id;

      // 2. Mutate live material
      await api("PATCH", `/api/collections/materials/records/${origMat.json.id}`, { unit_price: 999 }, tok);

      // 3. Attempt to apply with an arbitrary injected snapshot (fake item)
      const injectedSnapshot = {
        materials: [{ name: "InjectedForgedMat", quantity: 100, unit: "kg", unit_price: 1 }],
      };
      const r = await api("POST", `/api/versions/${vid}/apply`,
        { snapshot: injectedSnapshot }, tok);
      expect(r.status).toBe(200);

      // 4. Verify that restored material is the AUTHENTIC material, NOT the injected forged material!
      const matsAfter = await api("GET", `/api/collections/materials/records?filter=project_id%3D%22${pid}%22`, undefined, tok);
      const authenticRestored = matsAfter.json.items.find((m: any) => m.name === "AuthenticMat");
      const forgedFound = matsAfter.json.items.find((m: any) => m.name === "InjectedForgedMat");

      expect(authenticRestored).toBeDefined();
      expect(authenticRestored.unit_price).toBe(20);
      expect(forgedFound).toBeUndefined();

      // Cleanup
      if (authenticRestored) {
        await api("DELETE", `/api/collections/materials/records/${authenticRestored.id}`, undefined, tok);
      }
      await api("DELETE", `/api/collections/project_versions/records/${vid}`, undefined, tok);
    });

    itLive("SEC-P0: applying a version restores project currency and financial settings", async () => {
      // 1. Ensure project has known currency (USD) and markup (20)
      await api("PATCH", `/api/collections/projects/records/${pid}`, {
        currency: "USD",
        financial_settings: { overhead_percent: 10, markup_percent: 20, tax_percent: 5, contingency_percent: 5 },
      }, tok);

      // 2. Take version snapshot
      const v = await api("POST", `/api/projects/${pid}/versions`, { name: "v-pre-currency-change" }, tok);
      expect(v.status).toBe(200);
      const vid = v.json.id;

      // 3. Mutate project currency to EUR and change financial_settings
      await api("PATCH", `/api/collections/projects/records/${pid}`, {
        currency: "EUR",
        financial_settings: { overhead_percent: 15, markup_percent: 35, tax_percent: 10, contingency_percent: 5 },
      }, tok);

      const modifiedProject = await api("GET", `/api/collections/projects/records/${pid}`, undefined, tok);
      expect(modifiedProject.json.currency).toBe("EUR");
      expect(modifiedProject.json.financial_settings.markup_percent).toBe(35);

      // 4. Apply the version
      const applyRes = await api("POST", `/api/versions/${vid}/apply`, {}, tok);
      expect(applyRes.status).toBe(200);

      // 5. Verify project settings & currency are restored to what was captured in the snapshot
      const restoredProject = await api("GET", `/api/collections/projects/records/${pid}`, undefined, tok);
      expect(restoredProject.json.currency).toBe("USD");
      expect(restoredProject.json.financial_settings.markup_percent).toBe(20);

      // Cleanup
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

      // 2. Create an equipment item (rental): 2 qty, 100 cost_per_period, 3 duration, 50 maint, 50 fuel -> total_cost = 700
      const eq = await api("POST", "/api/collections/equipment_items/records", {
        project_id: testPid,
        user_id: uid,
        name: "Excavator",
        rental_or_purchase: "Rental",
        quantity: 2,
        cost_per_period: 100,
        usage_duration: 3,
        maintenance_cost: 50,
        fuel_cost: 50,
        total_cost: 700,
      }, tok);
      const eqId = eq.json.id;

      // 2b. Create a purchased equipment item: 1 qty, 1000 cost_per_period, 10 duration, 100 maint, 0 fuel -> total_cost = 1100 (duration NOT multiplied)
      const eqPurch = await api("POST", "/api/collections/equipment_items/records", {
        project_id: testPid,
        user_id: uid,
        name: "Purchased Crane",
        rental_or_purchase: "Purchase",
        quantity: 1,
        cost_per_period: 1000,
        usage_duration: 10,
        maintenance_cost: 100,
        fuel_cost: 0,
        total_cost: 1100,
      }, tok);
      const eqPurchId = eqPurch.json.id;

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

      // 5. Verify rental equipment: cost_per_period = 92, maintenance_cost = 46, fuel_cost = 46, total_cost = (2*92*3) + 46 + 46 = 644
      const eqAfter = await api("GET", `/api/collections/equipment_items/records/${eqId}`, undefined, tok);
      expect(eqAfter.json.cost_per_period).toBe(92);
      expect(eqAfter.json.maintenance_cost).toBe(46);
      expect(eqAfter.json.fuel_cost).toBe(46);
      expect(eqAfter.json.total_cost).toBe(644);

      // 5b. Verify purchased equipment: cost_per_period = 920, maintenance_cost = 92, total_cost = 920 * 1 + 92 = 1012 (duration 10 NOT multiplied)
      const eqPurchAfter = await api("GET", `/api/collections/equipment_items/records/${eqPurchId}`, undefined, tok);
      expect(eqPurchAfter.json.cost_per_period).toBe(920);
      expect(eqPurchAfter.json.maintenance_cost).toBe(92);
      expect(eqPurchAfter.json.total_cost).toBe(1012);

      // 6. Verify project currency updated
      const projAfter = await api("GET", `/api/collections/projects/records/${testPid}`, undefined, tok);
      expect(projAfter.json.currency).toBe("EUR");

      // Cleanup
      await api("DELETE", `/api/collections/labor_items/records/${laborId}`, undefined, tok);
      await api("DELETE", `/api/collections/equipment_items/records/${eqId}`, undefined, tok);
      await api("DELETE", `/api/collections/equipment_items/records/${eqPurchId}`, undefined, tok);
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

    itLive("super_admin can transfer project ownership (reassign user_id)", async () => {
      const upd = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        user_id: editorId,
      }, adminTok);
      expect(upd.status).toBe(200);
      expect(upd.json.user_id).toBe(editorId);

      // Revert back to original owner
      const revert = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        user_id: uid,
      }, adminTok);
      expect(revert.status).toBe(200);
      expect(revert.json.user_id).toBe(uid);
    });

    itLive("editor cannot tamper with project financial_settings or financial_settings_confirmed (AUTH-ADV-02)", async () => {
      // Ensure editor share is active on pid
      await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: editorId, role: "editor",
      }, tok);

      // 1. Editor attempts to update financial_settings
      const patchSettings = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        financial_settings: { markup_percent: 99, overhead_percent: 50 },
      }, editorTok);
      expect([400, 403, 404]).toContain(patchSettings.status);

      // 2. Editor attempts to update financial_settings_confirmed
      const patchConfirmed = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        financial_settings_confirmed: true,
      }, editorTok);
      expect([400, 403, 404]).toContain(patchConfirmed.status);

      // 3. Editor CAN update non-financial project metadata (e.g. description)
      const patchMeta = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        description: "Updated by editor without touching financials",
      }, editorTok);
      expect(patchMeta.status).toBe(200);

      // 4. Project owner CAN update financial_settings
      const ownerPatch = await api("PATCH", `/api/collections/projects/records/${pid}`, {
        financial_settings: { markup_percent: 25, overhead_percent: 10, tax_percent: 15, contingency_percent: 5 },
        financial_settings_confirmed: true,
      }, tok);
      expect(ownerPatch.status).toBe(200);
      expect(ownerPatch.json.financial_settings_confirmed).toBe(true);
    });

    itLive("authorized editor can delete child records on shared project (AUTH-ADV-03)", async () => {
      // 1. Owner creates a material in the shared project
      const mat = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "Rebar Editor Delete Test", quantity: 10, unit: "ton", unit_price: 800,
      }, tok);
      expect(mat.status).toBe(200);

      // 2. Editor successfully deletes owner's material in shared project
      const delMat = await api("DELETE", `/api/collections/materials/records/${mat.json.id}`, undefined, editorTok);
      expect(delMat.status).toBe(204);

      // 3. Editor creates and deletes a risk item in shared project
      const risk = await api("POST", "/api/collections/risks/records", {
        project_id: pid, user_id: editorId, description: "Editor Risk", probability: "low", impact_amount: 1000,
      }, editorTok);
      expect(risk.status).toBe(200);

      const delRisk = await api("DELETE", `/api/collections/risks/records/${risk.json.id}`, undefined, editorTok);
      expect(delRisk.status).toBe(204);

      // 4. Editor creates and deletes a project group in shared project
      const grp = await api("POST", "/api/collections/project_groups/records", {
        project_id: pid, user_id: editorId, name: "Editor Group", sort_order: 1,
      }, editorTok);
      expect(grp.status).toBe(200);

      const delGrp = await api("DELETE", `/api/collections/project_groups/records/${grp.json.id}`, undefined, editorTok);
      expect(delGrp.status).toBe(204);
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
      const r = await api("GET", "/api/collections/users/records?perPage=500&sort=-created", undefined, adminTok);
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

    itLive("public share endpoint strips proprietary data (PUB-01)", async () => {
      // Create material with supplier_options
      const mat = await api("POST", "/api/collections/materials/records", {
        project_id: pid,
        user_id: uid,
        name: "Proprietary Cement",
        quantity: 10,
        unit: "bag",
        unit_price: 25,
        supplier_options: [{ supplier: "Secret Supplier", price: 20 }],
      }, tok);
      expect(mat.status).toBe(200);

      const link = await api("POST", `/api/projects/${pid}/share-links`,
        { expires_at: future(), password: "secretsharepass1" }, tok);
      expect(link.status).toBe(200);
      const token = link.json.access_token;

      const res = await api("POST", `/api/share/${token}`, { password: "secretsharepass1" });
      expect(res.status).toBe(200);

      // Verify project proprietary data is stripped
      expect(res.json.project.financial_settings).toBeUndefined();
      expect(res.json.project.user_id).toBeUndefined();

      // Verify materials supplier_options and user_id are stripped
      expect(res.json.materials.length).toBeGreaterThan(0);
      const foundMat = res.json.materials.find((m: any) => m.id === mat.json.id);
      expect(foundMat).toBeDefined();
      expect(foundMat.supplier_options).toBeUndefined();
      expect(foundMat.user_id).toBeUndefined();

      // Verify child items have user_id stripped
      res.json.materials.forEach((m: any) => {
        expect(m.supplier_options).toBeUndefined();
        expect(m.user_id).toBeUndefined();
      });
      res.json.labor.forEach((l: any) => {
        expect(l.user_id).toBeUndefined();
      });
      res.json.equipment.forEach((eq: any) => {
        expect(eq.user_id).toBeUndefined();
      });
      res.json.additional.forEach((a: any) => {
        expect(a.user_id).toBeUndefined();
      });
      res.json.groups.forEach((g: any) => {
        expect(g.user_id).toBeUndefined();
      });

      // Verify raw risks are omitted
      expect(res.json.risks).toEqual([]);

      // Verify computed financials are provided without exposing margin formula parameters
      expect(res.json.financials).toBeDefined();
      expect(res.json.financials.grandTotal).toBeGreaterThan(0);

      // Cleanup
      await api("DELETE", `/api/collections/materials/records/${mat.json.id}`, undefined, tok);
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
    itLive("SEC-01: editor on Project A cannot mutate Project B child records", async () => {
      const RUN = String(Date.now());

      // 1. Create a second project owned by user A → Project B
      const pB = await api("POST", "/api/collections/projects/records", {
        name: "Project B " + RUN, currency: "USD", user_id: uid,
      }, tok);
      expect(pB.status).toBe(200);
      const pidB = pB.json.id;

      // Add a material to Project B
      const mB = await api("POST", "/api/collections/materials/records", {
        project_id: pidB, user_id: uid, name: "Material B", category: "Raw",
        quantity: 1, unit: "kg", unit_cost: 10,
      }, tok);
      expect(mB.status).toBe(200);
      const midB = mB.json.id;

      // 2. Create user B
      const emailB = `it-sec01-b-${RUN}@local.dev`;
      const bId = await makeUser(emailB);
      const lb = await login(emailB);
      const bTok = "Bearer " + lb.token;

      // 3. User A shares Project A (pid) with User B as EDITOR
      const shareA = await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: bId, shared_with_email: emailB, role: "editor",
      }, tok);
      expect(shareA.status).toBe(200);

      // 4. User A shares Project B (pidB) with User B as VIEWER only
      await api("POST", "/api/collections/project_shares/records", {
        project_id: pidB, shared_with_user_id: bId, shared_with_email: emailB, role: "viewer",
      }, tok);

      // 5. User B (viewer on B, editor on A) attempts to mutate Material B
      //    With the old @collection cross-join rules this would succeed because
      //    PB would independently match role="editor" from the Project A share
      //    row against project_id from the Project B share row.
      const patchB = await api("PATCH", `/api/collections/materials/records/${midB}`, {
        name: "Material B - Hacked",
      }, bTok);
      expect([403, 404]).toContain(patchB.status);

      // 6. User B also cannot mutate Project B itself
      const patchProj = await api("PATCH", `/api/collections/projects/records/${pidB}`, {
        name: "Hacked",
      }, bTok);
      expect([403, 404]).toContain(patchProj.status);

      // cleanup
      await api("DELETE", `/api/collections/materials/records/${midB}`, undefined, tok);
      await api("DELETE", `/api/collections/projects/records/${pidB}`, undefined, tok);
      await api("DELETE", `/api/collections/users/records/${bId}`, undefined, "Bearer " + su);
    });

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

    itLive("SEC-P0: audit log attributes action to editor actorId rather than record owner", async () => {
      // 1. Create a material as project owner
      const m = await api("POST", "/api/collections/materials/records", {
        project_id: pid, user_id: uid, name: "AuditEditorMat", quantity: 2, unit: "pcs", unit_price: 15,
      }, tok);
      expect(m.status).toBe(200);
      const matId = m.json.id;

      // 2. Create editor user and share project with role="editor"
      const su_ = "Bearer " + su;
      const editorEmail = `audit-editor-${Date.now()}@local.dev`;
      const editor = await api("POST", "/api/collections/users/records", {
        email: editorEmail, password: "testpass123", passwordConfirm: "testpass123", role: "user",
      }, su_);
      const editorId = editor.json.id;
      await api("POST", "/api/collections/project_shares/records", {
        project_id: pid, shared_with_user_id: editorId, shared_with_email: editorEmail, role: "editor",
      }, tok);

      const le = await login(editorEmail);
      const eTok = "Bearer " + le.token;

      // 3. Editor updates the material
      const updateRes = await api("PATCH", `/api/collections/materials/records/${matId}`, { quantity: 12 }, eTok);
      expect(updateRes.status).toBe(200);

      // 4. Fetch the audit log for this update
      const logs = await api(
        "GET",
        `/api/collections/audit_logs/records?filter=record_id%3D%22${matId}%22&sort=-created`,
        undefined,
        "Bearer " + su,
      );
      expect(logs.status).toBe(200);
      const items = logs.json.items || [];
      const updateRow = items.find((a: any) => a.action === "UPDATE");
      expect(updateRow).toBeTruthy();

      // The audit log must record the EDITOR's user ID, not the OWNER's user ID!
      expect(updateRow.user_id).toBe(editorId);

      // Cleanup
      await api("DELETE", `/api/collections/materials/records/${matId}`, undefined, tok);
      await api("DELETE", `/api/collections/users/records/${editorId}`, undefined, su_);
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
