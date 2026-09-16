/// <reference path="../pb_data/types.d.ts" />
// Remove the subscription feature: drop subscription_plan and
// subscription_expires_at from users and strip their :isset guards from
// updateRule. All users are unlimited, so no plan fields are needed.
migrate((app) => {
  const coll = app.findCollectionByNameOrId("users");
  const names = coll.fields.map((f) => f.name);
  if (names.includes("subscription_plan")) {
    coll.fields.removeByName("subscription_plan");
  }
  if (names.includes("subscription_expires_at")) {
    coll.fields.removeByName("subscription_expires_at");
  }
  coll.updateRule = 'id = @request.auth.id && @request.body.role:isset = false';
  app.save(coll);
});