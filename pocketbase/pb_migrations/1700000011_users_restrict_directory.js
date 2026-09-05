/// <reference path="../pb_data/types.d.ts" />
// H3: undo 1700000003 — the users collection was listable by any
// authenticated user, exposing email/name/company/subscription of everyone.
// Restrict to self + super_admin; collaboration UIs use POST
// /api/users/minimal for display identity instead.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.listRule = 'id = @request.auth.id || @request.auth.role = "super_admin"';
  users.viewRule = 'id = @request.auth.id || @request.auth.role = "super_admin"';
  app.save(users);
});
