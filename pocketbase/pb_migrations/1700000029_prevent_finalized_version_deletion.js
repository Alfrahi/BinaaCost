/// <reference path="../pb_data/types.d.ts" />
// HIST-03: Prevent finalized version deletion
// Only owner or super_admin may delete project_versions, AND is_final must not be true.

migrate((app) => {
  const coll = app.findCollectionByNameOrId("project_versions");
  coll.deleteRule =
    '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin") && is_final != true';
  app.save(coll);
  console.log("Updated project_versions.deleteRule to prevent deletion of finalized versions");
}, (app) => {
  const coll = app.findCollectionByNameOrId("project_versions");
  coll.deleteRule =
    'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';
  app.save(coll);
});
