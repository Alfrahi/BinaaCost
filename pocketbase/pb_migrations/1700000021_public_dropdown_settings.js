/// <reference path="../pb_data/types.d.ts" />
// DB-003: Open public read access to standard dropdown settings so that
// unauthenticated public share visitors can render units and labels without 401 errors.
migrate((app) => {
  const coll = app.findCollectionByNameOrId("dropdown_settings");
  const publicCategories = [
    "material_unit",
    "equipment_period_unit",
    "additional_cost_category",
    "risk_probability",
    "equipment_rental_purchase",
    "project_type",
    "project_size_unit",
    "duration_unit",
  ];
  const catFilter = publicCategories.map((c) => `category = "${c}"`).join(" || ");
  const rule = `@request.auth.id != "" || (${catFilter})`;

  coll.listRule = rule;
  coll.viewRule = rule;
  app.save(coll);
  console.log("DB-003: public read access configured on dropdown_settings");
});
