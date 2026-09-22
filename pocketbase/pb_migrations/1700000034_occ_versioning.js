/// <reference path="../pb_data/types.d.ts" />

const CONCURRENCY_COLLECTIONS = [
  "projects",
  "project_groups",
  "materials",
  "labor_items",
  "equipment_items",
  "additional_costs",
  "risks",
  "cost_database_items",
  "cost_assemblies",
  "cost_assembly_items",
];

migrate((app) => {
  for (const name of CONCURRENCY_COLLECTIONS) {
    try {
      const coll = app.findCollectionByNameOrId(name);
      const names = coll.fields.map((f) => f.name);
      
      if (!names.includes("version")) {
        coll.fields.push(
          new Field({
            name: "version",
            type: "number",
            required: true,
            min: 1
          })
        );
        app.save(coll);
        
        // Backfill existing rows with version 1
        app.db().newQuery(`UPDATE ${name} SET version = 1 WHERE version IS NULL OR version = 0`).execute();
        console.log(`Added 'version' column to ${name}`);
      }

      // Create SQLite Trigger for strict DB-level OCC enforcement
      // This ensures that the version always increments by exactly 1
      const triggerQuery = `
        CREATE TRIGGER IF NOT EXISTS trg_occ_versioning_${name}
        BEFORE UPDATE ON ${name}
        FOR EACH ROW
        BEGIN
          SELECT RAISE(ABORT, '409 Conflict: version mismatch')
          WHERE NEW.version != OLD.version + 1 AND NEW.id = OLD.id;
        END;
      `;
      app.db().newQuery(triggerQuery).execute();
      console.log(`Added OCC DB trigger to ${name}`);
    } catch (err) {
      console.log(`Failed to migrate collection ${name}:`, err);
      throw err;
    }
  }
}, (app) => {
  for (const name of CONCURRENCY_COLLECTIONS) {
    try {
      app.db().newQuery(`DROP TRIGGER IF EXISTS trg_occ_versioning_${name}`).execute();
      
      const coll = app.findCollectionByNameOrId(name);
      const names = coll.fields.map((f) => f.name);
      if (names.includes("version")) {
        coll.fields = coll.fields.filter(f => f.name !== "version");
        app.save(coll);
      }
    } catch (err) {
      console.log(`Failed to revert collection ${name}:`, err);
    }
  }
});
