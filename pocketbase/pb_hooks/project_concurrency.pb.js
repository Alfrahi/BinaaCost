/// <reference path="../pb_data/types.d.ts" />
// OCC: strict optimistic concurrency control for projects and child items.
// The client must submit the 'version' integer it read. The hook checks it
// and increments it. A SQLite BEFORE UPDATE trigger provides a bulletproof
// DB-level guarantee that NEW.version == OLD.version + 1. If it mismatches,
// the client receives a 409 Conflict.

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

function makeConcurrencyHandler(collName) {
  const cLit = JSON.stringify(collName);
  const msgLit = JSON.stringify(
    collName === "projects"
      ? "Project changed elsewhere; reload before saving"
      : "Record changed elsewhere; reload before saving",
  );
  return new Function(
    "e",
    `
    var body = e.requestInfo().body || {};
    var suppliedVersion = body.version;

    // Require the version field for OCC
    if (suppliedVersion == null || suppliedVersion === "") {
      throw new ApiError(400, "Missing 'version' field for concurrency check.", {});
    }

    suppliedVersion = parseInt(suppliedVersion, 10);
    if (isNaN(suppliedVersion)) {
      throw new ApiError(400, "Invalid 'version' field.", {});
    }

    var stored = null;
    try {
      stored = $app.findRecordById(${cLit}, e.record.id);
    } catch (_) {
      stored = null;
    }
    
    // If updating an existing record, perform a quick JS-level check
    // to return a friendly 409 Conflict before the DB trigger catches it.
    if (stored) {
      var storedVersion = stored.get("version");
      if (storedVersion && storedVersion !== suppliedVersion) {
        throw new ApiError(409, ${msgLit}, {});
      }
    }

    // Increment the version for the update query.
    // The SQLite BEFORE UPDATE trigger will strictly enforce NEW.version == OLD.version + 1.
    e.record.set("version", suppliedVersion + 1);

    e.next();
  `,
  );
}

for (const collName of CONCURRENCY_COLLECTIONS) {
  onRecordUpdateRequest(makeConcurrencyHandler(collName), collName);
  onRecordCreateRequest((e) => {
    e.record.set("version", 1);
    e.next();
  }, collName);
}