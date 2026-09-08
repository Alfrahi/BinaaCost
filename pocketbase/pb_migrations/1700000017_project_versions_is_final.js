/// <reference path="../pb_data/types.d.ts" />
// Adds is_final + created_by_user_id to project_versions.
// is_final locks a version (immutable snapshot; apply route rejects it).
// created_by_user_id is set by the JSVM create route but was missing from the
// schema — Record.set on a non-existent field throws, so version creation was
// broken. Adding it also enables author display in the version timeline.
migrate((app) => {
  const coll = app.findCollectionByNameOrId("project_versions");
  const names = coll.fields.map((f) => f.name);
  const usersId = app.findCollectionByNameOrId("users").id;
  const additions = [];

  if (!names.includes("is_final")) {
    additions.push(
      new Field({
        name: "is_final",
        type: "bool",
        required: false,
      }),
    );
  }
  if (!names.includes("created_by_user_id")) {
    additions.push(
      new Field({
        name: "created_by_user_id",
        type: "relation",
        collectionId: usersId,
        cascadeDelete: true,
        maxSelect: 1,
        required: false,
      }),
    );
  }

  if (additions.length > 0) {
    coll.fields = [...coll.fields, ...additions];
    app.save(coll);
    console.log("added is_final/created_by_user_id to project_versions");
  }
});