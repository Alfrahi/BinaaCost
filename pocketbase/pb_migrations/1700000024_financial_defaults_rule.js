/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const coll = app.findCollectionByNameOrId("app_settings");
  const rule =
    '@request.auth.role = "super_admin" || key = "user_signup" || key = "report_settings" || key = "financial_defaults"';
  coll.listRule = rule;
  coll.viewRule = rule;
  app.save(coll);
  console.log("Updated app_settings listRule and viewRule to include financial_defaults");
});
