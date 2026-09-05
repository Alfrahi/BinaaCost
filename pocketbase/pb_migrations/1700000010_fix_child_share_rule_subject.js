/// <reference path="../pb_data/types.d.ts" />
// Follow-up to 1700000009 (H4). The editor-share clause inherited from the
// init schema matched `@collection.project_shares.project_id ?= id`, which
// compares against the CHILD record id — so editor shares never granted
// create/update on child collections. Rewrite child rules with the clause
// matching the record's own project_id, keeping the H4 user_id bindings.
migrate((app) => {
  const shareEditChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';
  const shareReadChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id)';

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
    coll.listRule =
      'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareReadChild;
    coll.viewRule = coll.listRule;
    coll.createRule =
      '(project_id.user_id = @request.auth.id || ' + shareEditChild + ') && ' +
      '@request.body.user_id = @request.auth.id';
    coll.updateRule =
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild + ') && @request.body.user_id:isset = false';
    coll.deleteRule =
      'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';
    app.save(coll);
  }
});
