migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (users) {
    users.fields.add(new Field({
      name: "deleted_at",
      type: "date",
      required: false,
    }));
    app.save(users);
    console.log("Added deleted_at to users collection.");
  }
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  if (users) {
    users.fields.removeByName("deleted_at");
    app.save(users);
  }
});
