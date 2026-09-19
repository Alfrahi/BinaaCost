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

  let snapshot = null;
  if (body.snapshot) {
    if (body.snapshot.project_id && body.snapshot.project_id !== projectId) {
      throw new BadRequestError("snapshot.project_id does not match version");
    }
    snapshot = body.snapshot;
  } else {
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
