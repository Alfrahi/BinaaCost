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

  const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const name = esc(body.name);
  const unit = esc(body.unit);

  let record = null;
  try {
    record = $app.findFirstRecordByFilter(
      "library_materials",
      `user_id = "${auth.id}" && name = "${name}" && unit = "${unit}"`,
    );
  } catch (_) {
    record = null;
  }

  const ALLOWED_MATERIAL_FIELDS = ["name", "description", "unit", "unit_price"];

  if (record) {
    for (const k of ALLOWED_MATERIAL_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
        record.set(k, body[k]);
      }
    }
    record.set("user_id", auth.id);
    $app.save(record);
  } else {
    const coll = $app.findCollectionByNameOrId("library_materials");
    record = new Record(coll);
    record.set("user_id", auth.id);
    for (const k of ALLOWED_MATERIAL_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
        record.set(k, body[k]);
      }
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

  const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const workerType = esc(body.worker_type);

  let record = null;
  try {
    record = $app.findFirstRecordByFilter(
      "library_labor",
      `user_id = "${auth.id}" && worker_type = "${workerType}"`,
    );
  } catch (_) {
    record = null;
  }

  const ALLOWED_LABOR_FIELDS = ["worker_type", "daily_rate"];

  if (record) {
    for (const k of ALLOWED_LABOR_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
        record.set(k, body[k]);
      }
    }
    record.set("user_id", auth.id);
    $app.save(record);
  } else {
    const coll = $app.findCollectionByNameOrId("library_labor");
    record = new Record(coll);
    record.set("user_id", auth.id);
    for (const k of ALLOWED_LABOR_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
        record.set(k, body[k]);
      }
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

  const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const name = esc(body.name);
  const type = esc(body.type);
  const rental = esc(body.rental_or_purchase);
  const unit = esc(body.period_unit);

  let record = null;
  try {
    record = $app.findFirstRecordByFilter(
      "library_equipment",
      `user_id = "${auth.id}" && name = "${name}" && type = "${type}" && rental_or_purchase = "${rental}" && period_unit = "${unit}"`,
    );
  } catch (_) {
    record = null;
  }

  const ALLOWED_EQUIPMENT_FIELDS = [
    "name",
    "type",
    "rental_or_purchase",
    "cost_per_period",
    "period_unit",
  ];

  if (record) {
    for (const k of ALLOWED_EQUIPMENT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
        record.set(k, body[k]);
      }
    }
    record.set("user_id", auth.id);
    $app.save(record);
  } else {
    const coll = $app.findCollectionByNameOrId("library_equipment");
    record = new Record(coll);
    record.set("user_id", auth.id);
    for (const k of ALLOWED_EQUIPMENT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined) {
        record.set(k, body[k]);
      }
    }
    $app.save(record);
  }

  return e.json(200, { id: record.id });
});
