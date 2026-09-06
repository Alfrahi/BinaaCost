/// <reference path="../pb_data/types.d.ts" />
// Audit trail hook: writes an audit_logs row after each create/update/delete
// on tracked collections. Data-driven: the TRACKED table below is the single
// source of truth; a factory generates one handler body per (collection,
// action) with the collection name and whitelist inlined as literals —
// required because PB's JSVM re-parses each handler body per request and
// loses closure/module scope.
//
// old_data/new_data carry a compact field-diff (only changed keys). Fields
// are whitelisted per collection to keep rows small; denylisted credential
// fields are never logged.

const TRACKED = {
  projects: ["name", "description", "type", "size", "location", "client_requirements", "duration_days", "size_unit", "duration_unit", "currency", "financial_settings", "deleted_at"],
  project_groups: ["project_id", "name", "sort_order"],
  materials: ["project_id", "group_id", "name", "description", "quantity", "unit", "unit_price", "supplier_options"],
  labor_items: ["project_id", "group_id", "worker_type", "description", "number_of_workers", "daily_rate", "total_days", "total_cost"],
  equipment_items: ["project_id", "group_id", "name", "type", "rental_or_purchase", "quantity", "cost_per_period", "period_unit", "usage_duration", "maintenance_cost", "fuel_cost", "total_cost"],
  additional_costs: ["project_id", "group_id", "category", "description", "amount"],
  risks: ["project_id", "description", "probability", "impact_amount", "mitigation_plan", "contingency_amount"],
  comments: ["project_id", "content"],
  project_versions: ["project_id", "name", "data"],
  project_shares: ["project_id", "shared_with_user_id", "shared_with_email", "role"],
  shared_project_links: ["project_id", "created_by_user_id", "expires_at"],
  cost_databases: ["name", "description", "is_public", "currency"],
  cost_database_items: ["database_id", "csi_division", "csi_code", "description", "unit", "unit_price"],
  location_adjustments: ["database_id", "city", "multiplier"],
  cost_assemblies: ["name", "description", "category"],
  cost_assembly_items: ["assembly_id", "item_type", "description", "quantity", "unit", "unit_price", "details"],
  library_materials: ["name", "description", "unit", "unit_price"],
  library_labor: ["worker_type", "daily_rate"],
  library_equipment: ["name", "type", "rental_or_purchase", "cost_per_period", "period_unit"],
  risk_scenarios: ["name", "description", "impact_rules", "is_public"],
  dropdown_settings: ["category", "value", "translations", "numeric_value", "sort_order"],
  currency_rates: ["currency_code", "rate_to_usd"],
  app_settings: ["key", "value"],
};

FIELDS_DENYLIST = ["password","passwordConfirm","oldPassword","token","tokenKey","token_hash","password_hash","verificationToken","verification_token","emailVisibility"];

// Build the inline source of one audit row-writer. Every value referenced by
// the body is either (a) a JS literal baked in here, or (b) a PB runtime
// global ($app, $newRecord / e.record). Nothing is captured from module
// scope — PB re-parses the body per request.
function buildWriteBody(collection, action, fields) {
  const fLit = JSON.stringify(fields);
  const cLit = JSON.stringify(collection);
  let body = "";
  body += "var F=" + fLit + ",C=" + cLit + ";\n";
  body += "function snap(r){var o={};for(var i=0;i<F.length;i++){var k=F[i];";
  body += "var v=r.get(k);if(v!==null&&v!==undefined&&v!=='')o[k]=v;}return o;}\n";
  body += "function log(rec,od,nd){try{var c=$app.findCollectionByNameOrId('audit_logs');";
  body += "var L=new Record(c);L.set('action'," + JSON.stringify(action) + ");";
  body += "L.set('table_name',C);L.set('record_id',rec.id);";
  body += "if(od&&Object.keys(od).length)L.set('old_data',od);";
  body += "if(nd&&Object.keys(nd).length)L.set('new_data',nd);";
  body += "var u=rec.getString('user_id');if(u)L.set('user_id',u);";
  body += "$app.save(L);}catch(err){";
  body += "$app.logger().error('audit write failed ('+C+')','err',String(err));}}\n";
  return body;
}

// after-create: new_data = snapshot of the created row
function buildCreate(collection, fields) {
  let body = buildWriteBody(collection, "CREATE", fields);
  body += "var nd=snap(e.record);log(e.record,null,nd);\n";
  body += "e.next();\n";
  return new Function("e", body);
}

// after-delete: old_data = snapshot of the row just deleted
function buildDelete(collection, fields) {
  let body = buildWriteBody(collection, "DELETE", fields);
  body += "var od=snap(e.record);log(e.record,od,null);\n";
  body += "e.next();\n";
  return new Function("e", body);
}

// update-request: stash a snapshot of the STORED row under a namespaced key;
// onRecordUpdateRequest sees the new values already merged, so the old row
// must be read via findRecordById before the write commits.
function buildBeforeUpdate(collection, fields) {
  const fLit = JSON.stringify(fields);
  const key = JSON.stringify("audit_old_" + collection + "_");
  let body = "";
  body += "var F=" + fLit + ";\n";
  body += "try{var old=$app.findRecordById(" + JSON.stringify(collection) + ",e.record.id);";
  body += "var o={};for(var i=0;i<F.length;i++){var k=F[i];";
  body += "var v=old.get(k);if(v!==null&&v!==undefined&&v!=='')o[k]=v;}";
  body += "$app.store().set(" + key + "+e.record.id,o);}catch(e2){}\n";
  body += "e.next();\n";
  return new Function("e", body);
}

// after-update: pull the stashed old snapshot, diff whitelisted fields,
// log only the changed keys. stale store entries are removed regardless.
function buildAfterUpdate(collection, fields) {
  let body = buildWriteBody(collection, "UPDATE", fields);
  const key = JSON.stringify("audit_old_" + collection + "_");
  body += "var sk=" + key + "+e.record.id;\n";
  body += "var od=$app.store().get(sk);$app.store().remove(sk);od=od||{};\n";
  body += "var nd={};for(var i=0;i<F.length;i++){var k=F[i];";
  body += "var n=e.record.get(k);var o=od[k];";
  body += "if(n===null||n===undefined){delete od[k];continue;}";
  body += "if(String(n)===String(o))continue;";
  body += "nd[k]=n;if(o===undefined)delete od[k];}\n";
  body += "log(e.record,od,nd);\n";
  body += "e.next();\n";
  return new Function("e", body);
}

// Register the four handlers for every tracked collection. The collection
// name is passed as the trailing tag argument; the FIELD list and collection
// name are inlined as literals inside each built body.
for (const collection of Object.keys(TRACKED)) {
  const fields = TRACKED[collection].filter((f) => FIELDS_DENYLIST.indexOf(f) === -1);
  onRecordUpdateRequest(buildBeforeUpdate(collection, fields), collection);
  onRecordAfterCreateSuccess(buildCreate(collection, fields), collection);
  onRecordAfterUpdateSuccess(buildAfterUpdate(collection, fields), collection);
  onRecordAfterDeleteSuccess(buildDelete(collection, fields), collection);
}
