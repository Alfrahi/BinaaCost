/// <reference path="../pb_data/types.d.ts" />
// Remove company_name and company_website fields from users collection.
// Company details and report settings are maintained application-wide in app_settings.
migrate((app) => {
  const coll = app.findCollectionByNameOrId("users");
  const names = coll.fields.map((f) => f.name);
  if (names.includes("company_name")) {
    coll.fields.removeByName("company_name");
  }
  if (names.includes("company_website")) {
    coll.fields.removeByName("company_website");
  }
  app.save(coll);
  console.log("Removed company_name and company_website from users collection");
});
