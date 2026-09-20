/// <reference path="../pb_data/types.d.ts" />
// OCC: optimistic concurrency for projects and child items. The client sends the
// record's `updated` timestamp it read; if the stored `updated` differs, the
// write is stale and rejected with 409 so the client can surface a
// conflict dialog instead of silently overwriting.

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
    var supplied = body.updated;
    if (supplied == null || supplied === "") {
      e.next();
      return;
    }

    var stored = null;
    try {
      stored = $app.findRecordById(${cLit}, e.record.id);
    } catch (_) {
      stored = null;
    }
    if (!stored) {
      e.next();
      return;
    }

    var storedUpdated = stored.get("updated");
    if (storedUpdated && storedUpdated !== supplied) {
      throw new ApiError(409, ${msgLit}, {});
    }

    e.next();
  `,
  );
}

for (const collName of CONCURRENCY_COLLECTIONS) {
  onRecordUpdateRequest(makeConcurrencyHandler(collName), collName);
}