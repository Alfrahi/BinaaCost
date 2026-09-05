/// <reference path="../pb_data/types.d.ts" />
// H4: bind child-collection records to the caller's identity.
// createRule gains `@request.body.user_id = @request.auth.id` so a caller
// cannot mint rows carrying another user's id; updateRule gains
// `@request.body.user_id:isset = false` so user_id cannot be reassigned.
migrate((app) => {
  const children = [
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
  ];
  for (const name of children) {
    const coll = app.findCollectionByNameOrId(name);
    coll.createRule = "(" + coll.createRule + ") && @request.body.user_id = @request.auth.id";
    coll.updateRule = "(" + coll.updateRule + ") && @request.body.user_id:isset = false";
    app.save(coll);
  }
});
