/// <reference path="../pb_data/types.d.ts" />
// Comments target a specific item (material/labor/equipment/additional/risk):
// Supabase schema had item_id + item_type; carry them over.
migrate((app) => {
  const coll = app.findCollectionByNameOrId("comments");
  const names = coll.fields.map((f) => f.name);
  if (!names.includes("item_id")) {
    coll.fields.push(new Field({ name: "item_id", type: "text" }));
  }
  if (!names.includes("item_type")) {
    coll.fields.push(new Field({ name: "item_type", type: "text" }));
  }
  app.save(coll);
});
