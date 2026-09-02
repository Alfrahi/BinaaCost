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
  for (const coll of collections) {
    try {
      const rows = $app.findRecordsByFilter(
        coll,
        `project_id="${projectId}"`,
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
  rec.set("data", snapshot);
  $app.save(rec);

  return e.json(200, { id: rec.id });
});

routerAdd("POST", "/api/versions/{id}/apply", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const versionId = e.request.pathValue("id");
  const body = e.requestInfo().body || {};
  const snapshot = body.snapshot;
  if (!snapshot) {
    throw new BadRequestError("snapshot is required");
  }

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

  const collections = [
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "project_groups",
  ];

  $app.runInTransaction((txApp) => {
    for (const coll of collections) {
      const existing = txApp.findRecordsByFilter(
        coll,
        `project_id="${projectId}"`,
        "",
        0,
        0,
      );
      for (const row of existing) {
        txApp.delete(row);
      }
    }

    for (const coll of collections) {
      const items = snapshot[coll] || [];
      const meta = txApp.findCollectionByNameOrId(coll);
      for (const item of items) {
        const rec = new Record(meta);
        for (const k in item) {
          if (["id", "created", "updated", "expand", "collectionId", "collectionName"].indexOf(k) === -1) {
            rec.set(k, item[k]);
          }
        }
        rec.set("project_id", projectId);
        if (!rec.get("user_id")) {
          rec.set("user_id", auth.id);
        }
        txApp.save(rec);
      }
    }
  });

  return e.json(200, { success: true });
});
