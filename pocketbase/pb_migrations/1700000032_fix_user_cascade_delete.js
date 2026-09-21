/// <reference path="../pb_data/types.d.ts" />
// Fix user cascade deletion & super_admin user creation rule.
// 1. Set cascadeDelete = false on user_id across all project and library collections so deleting a user
//    never cascades into deleting project line items, project groups, or library resources.
// 2. Allow super_admin in users.createRule so admin panel can create accounts with any role.

migrate((app) => {
  const collections = [
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
    "project_versions",
    "cost_databases",
    "cost_database_items",
    "cost_assemblies",
    "cost_assembly_items",
    "library_materials",
    "library_labor",
    "library_equipment",
    "risk_scenarios",
  ];

  for (const name of collections) {
    let coll = null;
    try {
      coll = app.findCollectionByNameOrId(name);
    } catch (_) {
      continue;
    }
    if (!coll) continue;

    const userField = coll.fields.getByName("user_id");
    if (userField) {
      userField.cascadeDelete = false;
      app.save(coll);
      console.log(`Disabled cascadeDelete on ${name}.user_id`);
    }
  }

  // Update users createRule to permit super_admin creation
  const users = app.findCollectionByNameOrId("users");
  if (users) {
    users.createRule = '@request.auth.role = "super_admin" || @request.body.role = "" || @request.body.role = "user"';
    app.save(users);
    console.log("Updated users.createRule to allow super_admin");
  }
}, (app) => {
  const collections = [
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
    "project_versions",
    "cost_databases",
    "cost_database_items",
    "cost_assemblies",
    "cost_assembly_items",
    "library_materials",
    "library_labor",
    "library_equipment",
    "risk_scenarios",
  ];

  for (const name of collections) {
    let coll = null;
    try {
      coll = app.findCollectionByNameOrId(name);
    } catch (_) {
      continue;
    }
    if (!coll) continue;

    const userField = coll.fields.getByName("user_id");
    if (userField) {
      userField.cascadeDelete = true;
      app.save(coll);
    }
  }

  const users = app.findCollectionByNameOrId("users");
  if (users) {
    users.createRule = '@request.body.role = "" || @request.body.role = "user"';
    app.save(users);
  }
});
