/// <reference path="../pb_data/types.d.ts" />
// Hot lookup: shared_project_links.token_hash is searched on every
// /api/share/{token} hit. Add a simple index.
migrate((app) => {
  const coll = app.findCollectionByNameOrId("shared_project_links");
  const exists = coll.indexes.some((i) => i.includes("token_hash"));
  if (!exists) {
    coll.indexes.push(
      "CREATE INDEX `idx_spl_token_hash` ON `shared_project_links` (`token_hash`)",
    );
    app.save(coll);
  }
});
