/// <reference path="../pb_data/types.d.ts" />
// POST /api/import/cost_database_items — bulk CSV import with skip/overwrite
// strategy. Dedupes on (database_id, csi_code). Auth: authenticated users.
// Self-contained handler (no closures over file-scope vars).

routerAdd("POST", "/api/import/cost_database_items", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const body = e.requestInfo().body;
  const items = body.items;
  const strategy = body.strategy || "skip";
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestError("items array required");
  }
  if (items.length > 5000) {
    throw new BadRequestError("items must not exceed 5000");
  }

  const isSuperAdmin = auth.get("role") === "super_admin";
  const authorizedDbs = {};
  const authorizeDb = (dbId) => {
    if (Object.prototype.hasOwnProperty.call(authorizedDbs, dbId)) return;
    let db = null;
    try {
      db = $app.findRecordById("cost_databases", dbId);
    } catch (_) {
      db = null;
    }
    if (!db) throw new BadRequestError("unknown database_id: " + dbId);
    const allowed =
      db.get("user_id") === auth.id ||
      (isSuperAdmin && db.get("is_public") === true);
    if (!allowed) {
      throw new ForbiddenError("not allowed to import into this database");
    }
    authorizedDbs[dbId] = true;
  };

  const coll = $app.findCollectionByNameOrId("cost_database_items");
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  $app.runInTransaction((txApp) => {
    for (const item of items) {
      const dbId = item.database_id;
      const code = item.csi_code || "";
      if (!dbId) continue;
      authorizeDb(dbId);

      const esc = (s) => String(s).replace(/"/g, '\\"');
      let existing = null;
      try {
        existing = txApp.findFirstRecordByFilter(
          "cost_database_items",
          `database_id="${esc(dbId)}" && csi_code="${esc(code)}"`,
        );
      } catch (_) {
        existing = null;
      }

      if (existing) {
        if (strategy === "overwrite") {
          for (const k in item) {
            if (["id", "database_id", "csi_code", "created_at", "updated_at"].indexOf(k) === -1) {
              existing.set(k, item[k]);
            }
          }
          txApp.save(existing);
          updated += 1;
        } else {
          skipped += 1;
        }
      } else {
        const rec = new Record(coll);
        for (const k in item) {
          rec.set(k, item[k]);
        }
        rec.set("user_id", auth.id);
        txApp.save(rec);
        inserted += 1;
      }
    }
  });

  return e.json(200, { inserted, updated, skipped });
});
