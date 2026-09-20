/// <reference path="../pb_data/types.d.ts" />
// POST /api/projects/{id}/versions — snapshot project + child items to
// project_versions.data (owner only).
// POST /api/versions/{id}/apply — replace children from a snapshot
// (transactional, owner only).
// NOTE: JSVM handlers must be self-contained; no reliance on file-scope
// helpers referenced from route callbacks (goja scoping issue observed).

routerAdd("POST", "/api/projects/{id}/versions", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const projectId = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const name = body.name || "Untitled version";

  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Project not found");
  }
  if (project.get("user_id") !== auth.id) {
    throw new ForbiddenError("Only the owner can create versions");
  }

  const collections = [
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "project_groups",
  ];
  const snapshot = { project: project.publicExport() };
  const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  for (const coll of collections) {
    try {
      const rows = $app.findRecordsByFilter(
        coll,
        `project_id="${esc(projectId)}"`,
        "",
        0,
        0,
      );
      snapshot[coll] = rows.map((r) => r.publicExport());
    } catch (_) {
      snapshot[coll] = [];
    }
  }

  // HIST-01: Pre-calculate and freeze calculated summaries and financials
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const safeAdd = (...args) => r2(args.reduce((s, v) => s + (Number(v) || 0), 0));
  const safeMult = (...args) => r2(args.reduce((p, v) => p * (Number(v) || 0), 1));

  const rawMaterials = snapshot.materials || [];
  const rawLabor = snapshot.labor_items || [];
  const rawEquipment = snapshot.equipment_items || [];
  const rawAdditional = snapshot.additional_costs || [];
  const rawRisks = snapshot.risks || [];

  let mt = 0;
  for (let i = 0; i < rawMaterials.length; i++) {
    const q = Number(rawMaterials[i].quantity) || 0;
    const p = Number(rawMaterials[i].unit_price) || 0;
    mt = safeAdd(mt, safeMult(q, p));
  }

  let lt = 0;
  for (let i = 0; i < rawLabor.length; i++) {
    const nw = Number(rawLabor[i].number_of_workers) || 0;
    const dr = Number(rawLabor[i].daily_rate) || 0;
    const td = Number(rawLabor[i].total_days) || 0;
    lt = safeAdd(lt, safeMult(nw, dr, td));
  }

  let eq = 0;
  for (let i = 0; i < rawEquipment.length; i++) {
    const q = Number(rawEquipment[i].quantity) || 0;
    const c = Number(rawEquipment[i].cost_per_period) || 0;
    const isPurchase =
      String(rawEquipment[i].rental_or_purchase || "").toLowerCase() ===
      "purchase";
    const d = isPurchase ? 1 : Number(rawEquipment[i].usage_duration) || 0;
    const m = Number(rawEquipment[i].maintenance_cost) || 0;
    const f = Number(rawEquipment[i].fuel_cost) || 0;
    eq = safeAdd(eq, safeMult(q, c, d), m, f);
  }

  let ad = 0;
  for (let i = 0; i < rawAdditional.length; i++) {
    ad = safeAdd(ad, Number(rawAdditional[i].amount) || 0);
  }

  let rc = 0;
  for (let i = 0; i < rawRisks.length; i++) {
    const prob = rawRisks[i].probability;
    const impact = Number(rawRisks[i].impact_amount) || 0;
    const factor =
      prob === "high" ? 0.3 : prob === "medium" ? 0.2 : prob === "low" ? 0.1 : 0;
    rc = safeAdd(
      rc,
      Number(rawRisks[i].contingency_amount) || safeMult(factor, impact),
    );
  }

  snapshot.summary = {
    materials: mt,
    labor: lt,
    equipment: eq,
    additional: ad,
    directTotal: safeAdd(mt, lt, eq, ad),
  };

  let fs = null;
  try {
    const rawFs = project.getString("financial_settings");
    if (rawFs) fs = JSON.parse(rawFs);
  } catch (_) {
    fs = null;
  }
  if (!fs) {
    try {
      const g = project.get("financial_settings");
      if (typeof g === "string") fs = JSON.parse(g);
      else if (g) fs = JSON.parse(JSON.stringify(g));
    } catch (_) {
      fs = {};
    }
  }
  if (!fs || typeof fs !== "object") fs = {};

  const toCents = (n) => Math.round((Number(n) || 0) * 100);
  const locationFactor = Number(fs.location_factor) || 1;
  const mtAdj = r2(mt * locationFactor);
  const ltAdj = r2(lt * locationFactor);
  const eqAdj = r2(eq * locationFactor);

  const directC = toCents(mtAdj) + toCents(ltAdj) + toCents(eqAdj) + toCents(ad);
  const directBaseC = toCents(mt) + toCents(lt) + toCents(eq) + toCents(ad);
  const overheadC = Math.round(
    (directC * (Number(fs.overhead_percent) || 0)) / 100,
  );
  const flatContingencyC = Math.round(
    (directC * (Number(fs.contingency_percent) || 0)) / 100,
  );
  const riskContingencyC = toCents(rc);

  const basis = fs.contingency_basis || "flat";
  let contingencyC = flatContingencyC;
  if (basis === "risk_register") {
    contingencyC = riskContingencyC;
  } else if (basis === "combined") {
    contingencyC = flatContingencyC + riskContingencyC;
  }

  const primeC = directC + overheadC + contingencyC;
  const markupC = Math.round((primeC * (Number(fs.markup_percent) || 0)) / 100);
  const bidC = primeC + markupC;
  const taxC = Math.round((bidC * (Number(fs.tax_percent) || 0)) / 100);
  const totalC = bidC + taxC;

  snapshot.financials = {
    materialsTotal: mtAdj,
    laborTotal: ltAdj,
    equipmentTotal: eqAdj,
    additionalTotal: ad,
    directCostsBase: directBaseC / 100,
    locationAdjustmentAmount: (directC - directBaseC) / 100,
    directCosts: directC / 100,
    overheadAmount: overheadC / 100,
    contingencyAmount: contingencyC / 100,
    contingencyBasis: basis,
    flatContingencyAmount: flatContingencyC / 100,
    riskContingencyAmount: riskContingencyC / 100,
    primeCost: primeC / 100,
    markupAmount: markupC / 100,
    bidPrice: bidC / 100,
    taxAmount: taxC / 100,
    grandTotal: totalC / 100,
  };

  const coll = $app.findCollectionByNameOrId("project_versions");
  const rec = new Record(coll);
  rec.set("project_id", projectId);
  rec.set("name", name);
  rec.set("user_id", auth.id);
  rec.set("created_by_user_id", auth.id);
  rec.set("is_final", false);
  rec.set("data", snapshot);
  $app.save(rec);

  return e.json(200, { id: rec.id });
});

// POST /api/versions/{id}/finalize — lock a version as final (owner only).
// A finalized version's snapshot is immutable: the apply route rejects it.
routerAdd("POST", "/api/versions/{id}/finalize", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const versionId = e.request.pathValue("id");
  let version = null;
  try {
    version = $app.findRecordById("project_versions", versionId);
  } catch (_) {
    throw new NotFoundError("Version not found");
  }

  const projectId = version.get("project_id");
  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Project not found");
  }
  if (project.get("user_id") !== auth.id) {
    throw new ForbiddenError("Only the owner can finalize versions");
  }

  if (version.get("is_final")) {
    return e.json(200, { id: version.id, is_final: true });
  }

  version.set("is_final", true);
  $app.save(version);

  return e.json(200, { id: version.id, is_final: true });
});

routerAdd("POST", "/api/versions/{id}/apply", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const versionId = e.request.pathValue("id");
  const body = e.requestInfo().body || {};
  const createRollback = body.create_rollback === true;

  let version = null;
  try {
    version = $app.findRecordById("project_versions", versionId);
  } catch (_) {
    throw new NotFoundError("Version not found");
  }

  const projectId = version.get("project_id");
  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Project not found");
  }
  if (project.get("user_id") !== auth.id) {
    throw new ForbiddenError("Only the owner can apply versions");
  }

  // A finalized version is immutable — reject any apply/restore onto it.
  if (version.get("is_final")) {
    throw new BadRequestError("Finalized versions cannot be restored");
  }

  if (body.snapshot && body.snapshot.project_id && body.snapshot.project_id !== projectId) {
    throw new BadRequestError("snapshot.project_id does not match version");
  }

  // CRIT-03: Always load snapshot strictly from the database-stored version record.
  // Arbitrary snapshot injection via body.snapshot is completely disallowed.
  let snapshot = null;
  const rawStr = version.getString("data");
  if (rawStr) {
    try {
      snapshot = JSON.parse(rawStr);
    } catch (_) {
      snapshot = null;
    }
  }
  if (!snapshot) {
    snapshot = version.get("data");
  }
  if (!snapshot) {
    throw new BadRequestError("version has no snapshot data");
  }

  const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const collections = [
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "project_groups",
  ];

  const captureSnapshot = (txApp) => {
    const snap = { project: project.publicExport() };
    for (const coll of collections) {
      try {
        const rows = txApp.findRecordsByFilter(
          coll,
          `project_id="${esc(projectId)}"`,
          "",
          0,
          0,
        );
        snap[coll] = rows.map((r) => r.publicExport());
      } catch (_) {
        snap[coll] = [];
      }
    }

    const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const safeAdd = (...args) => r2(args.reduce((s, v) => s + (Number(v) || 0), 0));
    const safeMult = (...args) => r2(args.reduce((p, v) => p * (Number(v) || 0), 1));

    const rawMaterials = snap.materials || [];
    const rawLabor = snap.labor_items || [];
    const rawEquipment = snap.equipment_items || [];
    const rawAdditional = snap.additional_costs || [];
    const rawRisks = snap.risks || [];

    let mt = 0;
    for (let i = 0; i < rawMaterials.length; i++) {
      const q = Number(rawMaterials[i].quantity) || 0;
      const p = Number(rawMaterials[i].unit_price) || 0;
      mt = safeAdd(mt, safeMult(q, p));
    }

    let lt = 0;
    for (let i = 0; i < rawLabor.length; i++) {
      const nw = Number(rawLabor[i].number_of_workers) || 0;
      const dr = Number(rawLabor[i].daily_rate) || 0;
      const td = Number(rawLabor[i].total_days) || 0;
      lt = safeAdd(lt, safeMult(nw, dr, td));
    }

    let eq = 0;
    for (let i = 0; i < rawEquipment.length; i++) {
      const q = Number(rawEquipment[i].quantity) || 0;
      const c = Number(rawEquipment[i].cost_per_period) || 0;
      const isPurchase =
        String(rawEquipment[i].rental_or_purchase || "").toLowerCase() ===
        "purchase";
      const d = isPurchase ? 1 : Number(rawEquipment[i].usage_duration) || 0;
      const m = Number(rawEquipment[i].maintenance_cost) || 0;
      const f = Number(rawEquipment[i].fuel_cost) || 0;
      eq = safeAdd(eq, safeMult(q, c, d), m, f);
    }

    let ad = 0;
    for (let i = 0; i < rawAdditional.length; i++) {
      ad = safeAdd(ad, Number(rawAdditional[i].amount) || 0);
    }

    let rc = 0;
    for (let i = 0; i < rawRisks.length; i++) {
      const prob = rawRisks[i].probability;
      const impact = Number(rawRisks[i].impact_amount) || 0;
      const factor =
        prob === "high" ? 0.3 : prob === "medium" ? 0.2 : prob === "low" ? 0.1 : 0;
      rc = safeAdd(
        rc,
        Number(rawRisks[i].contingency_amount) || safeMult(factor, impact),
      );
    }

    snap.summary = {
      materials: mt,
      labor: lt,
      equipment: eq,
      additional: ad,
      directTotal: safeAdd(mt, lt, eq, ad),
    };

    let fs = null;
    try {
      const rawFs = project.getString("financial_settings");
      if (rawFs) fs = JSON.parse(rawFs);
    } catch (_) {
      fs = null;
    }
    if (!fs) {
      try {
        const g = project.get("financial_settings");
        if (typeof g === "string") fs = JSON.parse(g);
        else if (g) fs = JSON.parse(JSON.stringify(g));
      } catch (_) {
        fs = {};
      }
    }
    if (!fs || typeof fs !== "object") fs = {};

    const toCents = (n) => Math.round((Number(n) || 0) * 100);
    const locationFactor = Number(fs.location_factor) || 1;
    const mtAdj = r2(mt * locationFactor);
    const ltAdj = r2(lt * locationFactor);
    const eqAdj = r2(eq * locationFactor);

    const directC = toCents(mtAdj) + toCents(ltAdj) + toCents(eqAdj) + toCents(ad);
    const directBaseC = toCents(mt) + toCents(lt) + toCents(eq) + toCents(ad);
    const overheadC = Math.round(
      (directC * (Number(fs.overhead_percent) || 0)) / 100,
    );
    const flatContingencyC = Math.round(
      (directC * (Number(fs.contingency_percent) || 0)) / 100,
    );
    const riskContingencyC = toCents(rc);

    const basis = fs.contingency_basis || "flat";
    let contingencyC = flatContingencyC;
    if (basis === "risk_register") {
      contingencyC = riskContingencyC;
    } else if (basis === "combined") {
      contingencyC = flatContingencyC + riskContingencyC;
    }

    const primeC = directC + overheadC + contingencyC;
    const markupC = Math.round((primeC * (Number(fs.markup_percent) || 0)) / 100);
    const bidC = primeC + markupC;
    const taxC = Math.round((bidC * (Number(fs.tax_percent) || 0)) / 100);
    const totalC = bidC + taxC;

    snap.financials = {
      materialsTotal: mtAdj,
      laborTotal: ltAdj,
      equipmentTotal: eqAdj,
      additionalTotal: ad,
      directCostsBase: directBaseC / 100,
      locationAdjustmentAmount: (directC - directBaseC) / 100,
      directCosts: directC / 100,
      overheadAmount: overheadC / 100,
      contingencyAmount: contingencyC / 100,
      contingencyBasis: basis,
      flatContingencyAmount: flatContingencyC / 100,
      riskContingencyAmount: riskContingencyC / 100,
      primeCost: primeC / 100,
      markupAmount: markupC / 100,
      bidPrice: bidC / 100,
      taxAmount: taxC / 100,
      grandTotal: totalC / 100,
    };

    return snap;
  };

  const ALLOWED_SNAPSHOT_FIELDS = {
    project_groups: ["name", "sort_order"],
    materials: [
      "name",
      "description",
      "quantity",
      "unit",
      "unit_price",
      "supplier_options",
    ],
    labor_items: [
      "worker_type",
      "description",
      "number_of_workers",
      "daily_rate",
      "total_days",
      "total_cost",
    ],
    equipment_items: [
      "name",
      "type",
      "rental_or_purchase",
      "quantity",
      "cost_per_period",
      "period_unit",
      "usage_duration",
      "maintenance_cost",
      "fuel_cost",
      "total_cost",
    ],
    additional_costs: ["category", "description", "amount"],
    risks: [
      "description",
      "probability",
      "impact_amount",
      "mitigation_plan",
      "contingency_amount",
    ],
  };

  $app.runInTransaction((txApp) => {
    // M6: create the rollback snapshot atomically with the apply.
    if (createRollback) {
      const rollbackSnap = captureSnapshot(txApp);
      const vColl = txApp.findCollectionByNameOrId("project_versions");
      const rollback = new Record(vColl);
      rollback.set("project_id", projectId);
      rollback.set("name", "Rollback before apply");
      rollback.set("user_id", auth.id);
      rollback.set("created_by_user_id", auth.id);
      rollback.set("data", rollbackSnap);
      txApp.save(rollback);
    }

    // Delete existing records: delete child collections before groups
    for (const coll of collections) {
      const existing = txApp.findRecordsByFilter(
        coll,
        `project_id="${esc(projectId)}"`,
        "",
        0,
        0,
      );
      for (const row of existing) {
        txApp.delete(row);
      }
    }

    // DATA-001 & SEC-002: Restore project_groups FIRST and map old group ID -> new group ID
    const groupIdMap = {};
    const groups = snapshot.project_groups || [];
    const groupMeta = txApp.findCollectionByNameOrId("project_groups");
    for (const g of groups) {
      const rec = new Record(groupMeta);
      rec.set("project_id", projectId);
      rec.set("user_id", auth.id);
      for (const k of ALLOWED_SNAPSHOT_FIELDS.project_groups) {
        if (Object.prototype.hasOwnProperty.call(g, k) && g[k] !== undefined) {
          rec.set(k, g[k]);
        }
      }
      txApp.save(rec);
      if (g.id) {
        groupIdMap[g.id] = rec.id;
      }
    }

    // Restore child collections with mapped group_id and strict field allowlists
    const childCollections = [
      "materials",
      "labor_items",
      "equipment_items",
      "additional_costs",
      "risks",
    ];
    for (const coll of childCollections) {
      const items = snapshot[coll] || [];
      const meta = txApp.findCollectionByNameOrId(coll);
      const allowed = ALLOWED_SNAPSHOT_FIELDS[coll] || [];
      for (const item of items) {
        const rec = new Record(meta);
        rec.set("project_id", projectId);
        rec.set("user_id", auth.id);
        for (const k of allowed) {
          if (Object.prototype.hasOwnProperty.call(item, k) && item[k] !== undefined) {
            rec.set(k, item[k]);
          }
        }
        // Map group_id for collections that support groups
        if (coll !== "risks") {
          if (item.group_id && groupIdMap[item.group_id]) {
            rec.set("group_id", groupIdMap[item.group_id]);
          } else {
            rec.set("group_id", "");
          }
        }
        txApp.save(rec);
      }
    }
  });

  return e.json(200, { success: true });
});
