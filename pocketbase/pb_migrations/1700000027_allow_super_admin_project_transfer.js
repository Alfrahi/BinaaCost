/// <reference path="../pb_data/types.d.ts" />
// SEC-001 refinement: Allow super_admin to transfer project ownership
// while still enforcing user_id immutability for non-admin users (owners, editors).
// Also ensure project owners (including new owners after transfer) can list and view
// all child collection records (project_groups, materials, labor_items, etc.).

migrate((app) => {
  // 1. Update projects.updateRule to exempt super_admin from user_id:isset = false
  const projects = app.findCollectionByNameOrId("projects");
  const shareEdit =
    '(@collection.project_shares.project_id ?= id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';

  projects.updateRule =
    '@request.auth.role = "super_admin" || ' +
    `((user_id = @request.auth.id || ${shareEdit}) && @request.body.user_id:isset = false)`;
  app.save(projects);
  console.log("Updated projects.updateRule to allow super_admin ownership transfer");

  // 2. Ensure child collections listRule and viewRule include project_id.user_id = @request.auth.id
  const children = [
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
  ];

  const shareReadChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id)';

  for (const name of children) {
    const coll = app.findCollectionByNameOrId(name);
    coll.listRule =
      'project_id.user_id = @request.auth.id || user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareReadChild;
    coll.viewRule = coll.listRule;
    app.save(coll);
    console.log(`Updated ${name} listRule and viewRule with project_id.user_id access`);
  }
});
