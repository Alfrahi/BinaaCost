/// <reference path="../pb_data/types.d.ts" />
// audit_logs.user_id must be a relation to users (expand used by admin UI).
migrate((app) => {
  const coll = app.findCollectionByNameOrId("audit_logs");
  const fields = coll.fields;
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].name === "user_id") {
      fields[i].type = "relation";
      fields[i].collectionId = app.findCollectionByNameOrId("users").id;
      fields[i].cascadeDelete = false;
      fields[i].maxSelect = 1;
      fields[i].required = false;
    }
  }
  app.save(coll);
});
