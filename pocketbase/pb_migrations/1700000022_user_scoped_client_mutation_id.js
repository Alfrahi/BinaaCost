/// <reference path="../pb_data/types.d.ts" />
// DB-002: Scope client_mutation_id unique indexes per user (user_id, client_mutation_id)
// to prevent cross-tenant collision/denial-of-service across distinct user accounts.
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
    const oldIndexName = `idx_${name}_cmid`;
    const newIndexName = `idx_${name}_user_cmid`;

    coll.indexes = (coll.indexes || []).filter(
      (idx) => !idx.includes(oldIndexName) && !idx.includes(newIndexName),
    );

    const newIndex = `CREATE UNIQUE INDEX ${newIndexName} ON ${name} (user_id, client_mutation_id) WHERE client_mutation_id IS NOT NULL AND client_mutation_id != ''`;
    coll.indexes.push(newIndex);
    app.save(coll);
    console.log(`DB-002: scoped client_mutation_id unique index on ${name}`);
  }
});
