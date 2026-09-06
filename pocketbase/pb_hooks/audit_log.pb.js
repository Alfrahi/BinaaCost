/// <reference path="../pb_data/types.d.ts" />
// Audit trail hook: writes an audit_logs row after each create/update/delete
// on tracked collections. Record-collection scope closure state is lost in
// PB's JSVM; handlers are generated with inline literals.

// Generated per-collection registrations follow.

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "projects");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (projects)", "err", String(err));
  }
  e.next();
}, "projects");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "projects");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (projects)", "err", String(err));
  }
  e.next();
}, "projects");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "projects");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (projects)", "err", String(err));
  }
  e.next();
}, "projects");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "project_groups");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_groups)", "err", String(err));
  }
  e.next();
}, "project_groups");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "project_groups");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_groups)", "err", String(err));
  }
  e.next();
}, "project_groups");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "project_groups");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_groups)", "err", String(err));
  }
  e.next();
}, "project_groups");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "materials");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (materials)", "err", String(err));
  }
  e.next();
}, "materials");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "materials");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (materials)", "err", String(err));
  }
  e.next();
}, "materials");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "materials");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (materials)", "err", String(err));
  }
  e.next();
}, "materials");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "labor_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (labor_items)", "err", String(err));
  }
  e.next();
}, "labor_items");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "labor_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (labor_items)", "err", String(err));
  }
  e.next();
}, "labor_items");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "labor_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (labor_items)", "err", String(err));
  }
  e.next();
}, "labor_items");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "equipment_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (equipment_items)", "err", String(err));
  }
  e.next();
}, "equipment_items");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "equipment_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (equipment_items)", "err", String(err));
  }
  e.next();
}, "equipment_items");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "equipment_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (equipment_items)", "err", String(err));
  }
  e.next();
}, "equipment_items");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "additional_costs");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (additional_costs)", "err", String(err));
  }
  e.next();
}, "additional_costs");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "additional_costs");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (additional_costs)", "err", String(err));
  }
  e.next();
}, "additional_costs");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "additional_costs");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (additional_costs)", "err", String(err));
  }
  e.next();
}, "additional_costs");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "risks");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (risks)", "err", String(err));
  }
  e.next();
}, "risks");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "risks");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (risks)", "err", String(err));
  }
  e.next();
}, "risks");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "risks");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (risks)", "err", String(err));
  }
  e.next();
}, "risks");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "comments");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (comments)", "err", String(err));
  }
  e.next();
}, "comments");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "comments");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (comments)", "err", String(err));
  }
  e.next();
}, "comments");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "comments");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (comments)", "err", String(err));
  }
  e.next();
}, "comments");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "project_versions");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_versions)", "err", String(err));
  }
  e.next();
}, "project_versions");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "project_versions");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_versions)", "err", String(err));
  }
  e.next();
}, "project_versions");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "project_versions");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_versions)", "err", String(err));
  }
  e.next();
}, "project_versions");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "project_shares");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_shares)", "err", String(err));
  }
  e.next();
}, "project_shares");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "project_shares");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_shares)", "err", String(err));
  }
  e.next();
}, "project_shares");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "project_shares");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (project_shares)", "err", String(err));
  }
  e.next();
}, "project_shares");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "shared_project_links");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (shared_project_links)", "err", String(err));
  }
  e.next();
}, "shared_project_links");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "shared_project_links");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (shared_project_links)", "err", String(err));
  }
  e.next();
}, "shared_project_links");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "shared_project_links");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (shared_project_links)", "err", String(err));
  }
  e.next();
}, "shared_project_links");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "cost_databases");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_databases)", "err", String(err));
  }
  e.next();
}, "cost_databases");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "cost_databases");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_databases)", "err", String(err));
  }
  e.next();
}, "cost_databases");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "cost_databases");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_databases)", "err", String(err));
  }
  e.next();
}, "cost_databases");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "cost_database_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_database_items)", "err", String(err));
  }
  e.next();
}, "cost_database_items");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "cost_database_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_database_items)", "err", String(err));
  }
  e.next();
}, "cost_database_items");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "cost_database_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_database_items)", "err", String(err));
  }
  e.next();
}, "cost_database_items");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "location_adjustments");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (location_adjustments)", "err", String(err));
  }
  e.next();
}, "location_adjustments");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "location_adjustments");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (location_adjustments)", "err", String(err));
  }
  e.next();
}, "location_adjustments");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "location_adjustments");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (location_adjustments)", "err", String(err));
  }
  e.next();
}, "location_adjustments");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "cost_assemblies");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_assemblies)", "err", String(err));
  }
  e.next();
}, "cost_assemblies");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "cost_assemblies");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_assemblies)", "err", String(err));
  }
  e.next();
}, "cost_assemblies");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "cost_assemblies");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_assemblies)", "err", String(err));
  }
  e.next();
}, "cost_assemblies");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "cost_assembly_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_assembly_items)", "err", String(err));
  }
  e.next();
}, "cost_assembly_items");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "cost_assembly_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_assembly_items)", "err", String(err));
  }
  e.next();
}, "cost_assembly_items");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "cost_assembly_items");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (cost_assembly_items)", "err", String(err));
  }
  e.next();
}, "cost_assembly_items");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "library_materials");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_materials)", "err", String(err));
  }
  e.next();
}, "library_materials");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "library_materials");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_materials)", "err", String(err));
  }
  e.next();
}, "library_materials");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "library_materials");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_materials)", "err", String(err));
  }
  e.next();
}, "library_materials");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "library_labor");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_labor)", "err", String(err));
  }
  e.next();
}, "library_labor");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "library_labor");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_labor)", "err", String(err));
  }
  e.next();
}, "library_labor");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "library_labor");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_labor)", "err", String(err));
  }
  e.next();
}, "library_labor");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "library_equipment");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_equipment)", "err", String(err));
  }
  e.next();
}, "library_equipment");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "library_equipment");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_equipment)", "err", String(err));
  }
  e.next();
}, "library_equipment");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "library_equipment");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (library_equipment)", "err", String(err));
  }
  e.next();
}, "library_equipment");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "risk_scenarios");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (risk_scenarios)", "err", String(err));
  }
  e.next();
}, "risk_scenarios");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "risk_scenarios");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (risk_scenarios)", "err", String(err));
  }
  e.next();
}, "risk_scenarios");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "risk_scenarios");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (risk_scenarios)", "err", String(err));
  }
  e.next();
}, "risk_scenarios");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "dropdown_settings");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (dropdown_settings)", "err", String(err));
  }
  e.next();
}, "dropdown_settings");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "dropdown_settings");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (dropdown_settings)", "err", String(err));
  }
  e.next();
}, "dropdown_settings");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "dropdown_settings");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (dropdown_settings)", "err", String(err));
  }
  e.next();
}, "dropdown_settings");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "currency_rates");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (currency_rates)", "err", String(err));
  }
  e.next();
}, "currency_rates");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "currency_rates");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (currency_rates)", "err", String(err));
  }
  e.next();
}, "currency_rates");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "currency_rates");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (currency_rates)", "err", String(err));
  }
  e.next();
}, "currency_rates");

onRecordAfterCreateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "CREATE");
    log.set("table_name", "app_settings");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (app_settings)", "err", String(err));
  }
  e.next();
}, "app_settings");

onRecordAfterUpdateSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "UPDATE");
    log.set("table_name", "app_settings");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (app_settings)", "err", String(err));
  }
  e.next();
}, "app_settings");

onRecordAfterDeleteSuccess((e) => {
  try {
    const logColl = $app.findCollectionByNameOrId("audit_logs");
    const log = new Record(logColl);
    log.set("action", "DELETE");
    log.set("table_name", "app_settings");
    log.set("record_id", e.record.id);
    log.set("new_data", { id: e.record.id  });
    const uid = e.record.getString("user_id");
    if (uid) log.set("user_id", uid);
    $app.save(log);
  } catch (err) {
    $app.logger().error("audit write failed (app_settings)", "err", String(err));
  }
  e.next();
}, "app_settings");
