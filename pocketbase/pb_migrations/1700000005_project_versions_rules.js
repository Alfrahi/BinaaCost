/// <reference path="../pb_data/types.d.ts" />
// project_versions: add read/write rules for project owner + super_admin
// (Phase-0 migration only set deleteRule).
const ownerOrAdmin =
  'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';

migrate((app) => {
  const coll = app.findCollectionByNameOrId("project_versions");
  coll.listRule = ownerOrAdmin;
  coll.viewRule = ownerOrAdmin;
  coll.createRule = ownerOrAdmin;
  coll.updateRule = ownerOrAdmin;
  app.save(coll);
});
