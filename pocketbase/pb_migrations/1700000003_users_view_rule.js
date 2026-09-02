/// <reference path="../pb_data/types.d.ts" />
// Collaboration UI (shared projects, comments) needs author email/name on
// expanded user records — allow any authenticated user to view users.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.listRule = '@request.auth.id != ""';
  users.viewRule = '@request.auth.id != ""';
  app.save(users);
});
