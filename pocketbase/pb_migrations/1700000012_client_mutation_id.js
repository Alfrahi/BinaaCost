/// <reference path="../pb_data/types.d.ts" />
// M2: idempotent offline INSERTs. Add a nullable unique-indexed
// client_mutation_id to collections that support offline INSERT. A retry
// after a lost response hits the unique index and is treated as success
// instead of creating a duplicate row.
migrate((app) => {
  const targets = [
    "projects",
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
  ];

  for (const name of targets) {
    const coll = app.findCollectionByNameOrId(name);
    const names = coll.fields.map((f) => f.name);
    if (names.includes("client_mutation_id")) continue;

    coll.fields = [
      ...coll.fields,
      new Field({ name: "client_mutation_id", type: "text" }),
    ];
    coll.indexes = [
      ...(coll.indexes || []),
      `CREATE UNIQUE INDEX idx_${name}_cmid ON ${name} (client_mutation_id) WHERE client_mutation_id IS NOT NULL AND client_mutation_id != ''`,
    ];
    app.save(coll);
    console.log(`added client_mutation_id to ${name}`);
  }
});