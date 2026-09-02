/// <reference path="../pb_data/types.d.ts" />
// Replace the old text password_hash with a proper password-type field so
// PocketBase derives a bcrypt hash server-side and validatePassword()
// can compare candidates. Old column had no real data (sharing moved to
// JSVM routes in the same phase).
migrate((app) => {
  const coll = app.findCollectionByNameOrId("shared_project_links");
  coll.fields.removeByName("password_hash");
  coll.fields.add(new Field({
    name: "password",
    type: "password",
    hidden: true,
  }));
  app.save(coll);
}, (app) => {
  const coll = app.findCollectionByNameOrId("shared_project_links");
  coll.fields.removeByName("password");
  coll.fields.add(new Field({
    name: "password_hash",
    type: "text",
  }));
  app.save(coll);
});
