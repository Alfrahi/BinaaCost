/// <reference path="../pb_data/types.d.ts" />
// SEC-001: Enforce user_id immutability across all root/base collections.
// Prevents editors or collaborators from reassigning user_id on projects,
// cost databases, cost assemblies, library items, risk scenarios, and project versions.
migrate((app) => {
  const targets = [
    "projects",
    "cost_databases",
    "cost_assemblies",
    "library_materials",
    "library_labor",
    "library_equipment",
    "risk_scenarios",
    "project_versions",
  ];

  for (const name of targets) {
    let coll = null;
    try {
      coll = app.findCollectionByNameOrId(name);
    } catch (_) {
      coll = null;
    }
    if (!coll) continue;

    // Check if the collection has user_id field
    const fieldNames = coll.fields.map((f) => f.name);
    if (!fieldNames.includes("user_id")) continue;

    if (coll.updateRule && !coll.updateRule.includes("@request.body.user_id:isset = false")) {
      coll.updateRule = "(" + coll.updateRule + ") && @request.body.user_id:isset = false";
      app.save(coll);
      console.log(`SEC-001: user_id immutability added to ${name}.updateRule`);
    }
  }
});
