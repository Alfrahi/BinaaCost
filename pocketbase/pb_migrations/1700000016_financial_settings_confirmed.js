/// <reference path="../pb_data/types.d.ts" />
// Tracks whether a project's financial settings were ever explicitly saved.
// Projects get default percentages at creation; until the owner saves pricing
// settings the flag stays false and the UI warns before share/export.
migrate((app) => {
  const coll = app.findCollectionByNameOrId("projects");
  const names = coll.fields.map((f) => f.name);
  if (!names.includes("financial_settings_confirmed")) {
    coll.fields = [
      ...coll.fields,
      new Field({
        name: "financial_settings_confirmed",
        type: "bool",
        required: false,
      }),
    ];
    app.save(coll);
    console.log("added financial_settings_confirmed to projects");
  }
});
