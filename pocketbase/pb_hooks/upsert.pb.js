/// <reference path="../pb_data/types.d.ts" />
// Upsert routes for library sync (replaces Supabase upsert onConflict).
// PocketBase has no composite unique constraints; conflict resolution happens
// here: find by key fields, update if found, else create.
//
// Note: JSVM route handlers lose access to file-scope consts/factories, so
// each route carries its own literal payload and key fields.

routerAdd("POST", "/api/upsert/library_materials", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const body = e.requestInfo().body;
  body.user_id = auth.id;
  delete body.id;

  const name = String(body.name ?? "").replace(/"/g, '\\"');
  const unit = String(body.unit ?? "").replace(/"/g, '\\"');

  let record = null;
  try {
    record = $app.findFirstRecordByFilter(
      "library_materials",
      `user_id = "${auth.id}" && name = "${name}" && unit = "${unit}"`,
    );
  } catch (_) {
    record = null;
  }

  if (record) {
    for (const [k, v] of Object.entries(body)) {
      record.set(k, v);
    }
    $app.save(record);
  } else {
    const coll = $app.findCollectionByNameOrId("library_materials");
    record = new Record(coll);
    for (const [k, v] of Object.entries(body)) {
      record.set(k, v);
    }
    $app.save(record);
  }

  return e.json(200, { id: record.id });
});

routerAdd("POST", "/api/upsert/library_labor", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const body = e.requestInfo().body;
  body.user_id = auth.id;
  delete body.id;

  const workerType = String(body.worker_type ?? "").replace(/"/g, '\\"');

  let record = null;
  try {
    record = $app.findFirstRecordByFilter(
      "library_labor",
      `user_id = "${auth.id}" && worker_type = "${workerType}"`,
    );
  } catch (_) {
    record = null;
  }

  if (record) {
    for (const [k, v] of Object.entries(body)) {
      record.set(k, v);
    }
    $app.save(record);
  } else {
    const coll = $app.findCollectionByNameOrId("library_labor");
    record = new Record(coll);
    for (const [k, v] of Object.entries(body)) {
      record.set(k, v);
    }
    $app.save(record);
  }

  return e.json(200, { id: record.id });
});

routerAdd("POST", "/api/upsert/library_equipment", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const body = e.requestInfo().body;
  body.user_id = auth.id;
  delete body.id;

  const q = (v) => String(v ?? "").replace(/"/g, '\\"');
  const name = q(body.name);
  const type = q(body.type);
  const rental = q(body.rental_or_purchase);
  const unit = q(body.period_unit);

  let record = null;
  try {
    record = $app.findFirstRecordByFilter(
      "library_equipment",
      `user_id = "${auth.id}" && name = "${name}" && type = "${type}" && rental_or_purchase = "${rental}" && period_unit = "${unit}"`,
    );
  } catch (_) {
    record = null;
  }

  if (record) {
    for (const [k, v] of Object.entries(body)) {
      record.set(k, v);
    }
    $app.save(record);
  } else {
    const coll = $app.findCollectionByNameOrId("library_equipment");
    record = new Record(coll);
    for (const [k, v] of Object.entries(body)) {
      record.set(k, v);
    }
    $app.save(record);
  }

  return e.json(200, { id: record.id });
});
