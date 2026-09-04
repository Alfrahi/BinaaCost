/// <reference path="../pb_data/types.d.ts" />
// Initial schema (1700000000) defined fields explicitly, which skipped
// PocketBase's implicit created/updated autodate columns. Any
// sort=-created request 400s with "invalid sort field". Add them to
// every base collection still missing them. Existing rows get their
// created/updated backfilled to "now" (there is no older timestamp
// source to restore).
migrate((app) => {
  const collections = app.findAllCollections();
  const now = new Date().toISOString().replace("T", " ").slice(0, 23) + "Z";
  for (const coll of collections) {
    if (coll.type !== "base" || coll.name.startsWith("_")) continue;
    const names = coll.fields.map((f) => f.name);
    const missing = [];
    if (!names.includes("created")) {
      missing.push(
        new Field({ name: "created", type: "autodate", onCreate: true }),
      );
    }
    if (!names.includes("updated")) {
      missing.push(
        new Field({
          name: "updated",
          type: "autodate",
          onCreate: true,
          onUpdate: true,
        }),
      );
    }
    if (missing.length === 0) continue;
    coll.fields = [...coll.fields, ...missing];
    app.save(coll);
    // Backfill so pre-existing rows don't sort as empty strings.
    for (const col of missing.map((f) => f.name)) {
      app.db().update(coll.name, { [col]: now }, $dbx.exp(`${col} = ''`)).execute();
    }
    console.log(`added created/updated to ${coll.name}`);
  }
});
