/// <reference path="../pb_data/types.d.ts" />
// AUTH-ADV-02 & AUTH-ADV-03: Fix editor permissions:
// 1. (AUTH-ADV-02) Block financial settings tampering: editors (non-owners/non-admins)
//    must NOT be allowed to update financial_settings or financial_settings_confirmed on projects.
// 2. (AUTH-ADV-03) Allow child deletion: authorized editors with role="editor"
//    on the parent project must be allowed to delete records in child collections
//    (project_groups, materials, labor_items, equipment_items, additional_costs, risks, comments).

migrate((app) => {
  // 1. Restrict projects.updateRule so editors cannot tamper with financial_settings
  const projects = app.findCollectionByNameOrId("projects");
  const shareEdit =
    '(@collection.project_shares.project_id ?= id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';

  projects.updateRule =
    '@request.auth.role = "super_admin" || ' +
    '(user_id = @request.auth.id && @request.body.user_id:isset = false) || ' +
    `(${shareEdit} && @request.body.user_id:isset = false && @request.body.financial_settings:isset = false && @request.body.financial_settings_confirmed:isset = false)`;
  app.save(projects);
  console.log("Updated projects.updateRule to protect financial_settings from editor tampering");

  // 2. Allow authorized editors to delete child records
  const shareEditChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';

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
    coll.deleteRule =
      'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild;
    app.save(coll);
    console.log(`Updated ${name}.deleteRule to allow authorized editors to delete child records`);
  }
});
