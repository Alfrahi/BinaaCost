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
//
// FIX (2026-09-23): Consolidated audit logging into request hooks only.
// The previous implementation used onRecordAfterCreateSuccess/UpdateSuccess/
// DeleteSuccess (model-level hooks) which receive a different event object
// (core.RecordEvent) that does NOT share e.get()/e.set()/e.auth with the
// request hooks (core.RecordRequestEvent). This caused:
//   TypeError: Object has no member 'get'
// ...which crashed AFTER the DB commit, returning 400 to the client even
// though the operation actually succeeded.
//
// The fix uses only onRecordCreateRequest / onRecordUpdateRequest /
// onRecordDeleteRequest. Code before e.next() captures old state; e.next()
// performs the DB operation; code after e.next() logs the audit row.

const TRACKED = {
  projects: ["name", "description", "type", "size", "location", "client_requirements", "duration_days", "size_unit", "duration_unit", "currency", "financial_settings", "deleted_at", "user_id"],
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

var FIELDS_DENYLIST = ["password","passwordConfirm","oldPassword","token","tokenKey","token_hash","password_hash","verificationToken","verification_token","emailVisibility"];

// Shared helper source: snapshot whitelisted fields from a record,
// and write an audit_logs row. Inlined as string literals so each
// handler body is self-contained (PB JSVM constraint).
function buildHelpers(collection, fields) {
  const fLit = JSON.stringify(fields);
  const cLit = JSON.stringify(collection);
  let src = "";
  src += "var F=" + fLit + ",C=" + cLit + ";\n";
  src += "function snap(r){var o={};for(var i=0;i<F.length;i++){var k=F[i];";
  src += "try{var v=r.get(k);if(v!==null&&v!==undefined&&v!=='')o[k]=v;}catch(_){}}return o;}\n";
  src += "function log(rec,action,od,nd,actorId){try{var c=$app.findCollectionByNameOrId('audit_logs');";
  src += "var L=new Record(c);L.set('action',action);";
  src += "L.set('table_name',C);L.set('record_id',rec.id);";
  src += "if(od&&Object.keys(od).length)L.set('old_data',od);";
  src += "if(nd&&Object.keys(nd).length)L.set('new_data',nd);";
  src += "var u=actorId||(rec.getString?rec.getString('user_id'):'');if(u)L.set('user_id',u);";
  src += "$app.save(L);}catch(err){";
  src += "$app.logger().error('audit write failed ('+C+')','err',String(err));}}\n";
  return src;
}

// CREATE handler: runs inside onRecordCreateRequest.
// After e.next() the record is committed; snapshot and log it.
function buildCreateHandler(collection, fields) {
  let body = buildHelpers(collection, fields);
  body += "var actorId=(e.auth&&e.auth.id)||null;\n";
  body += "e.next();\n";
  body += "var nd=snap(e.record);log(e.record,'CREATE',null,nd,actorId);\n";
  return new Function("e", body);
}

// UPDATE handler: runs inside onRecordUpdateRequest.
// Before e.next(): fetch the old row from DB for diffing.
// After e.next(): snapshot new values and log the diff.
function buildUpdateHandler(collection, fields) {
  let body = buildHelpers(collection, fields);
  body += "var actorId=(e.auth&&e.auth.id)||null;\n";
  body += "var od={};\n";
  body += "try{var old=$app.findRecordById(" + JSON.stringify(collection) + ",e.record.id);od=snap(old);}catch(_){}\n";
  body += "e.next();\n";
  body += "var nd={};for(var i=0;i<F.length;i++){var k=F[i];\n";
  body += "  try{var n=e.record.get(k);var o=od[k];\n";
  body += "  if(n===undefined){delete od[k];continue;}\n";
  body += "  if(String(n)===String(o))continue;\n";
  body += "  nd[k]=n;if(o===undefined)delete od[k];}catch(_){}}\n";
  body += "log(e.record,'UPDATE',od,nd,actorId);\n";
  return new Function("e", body);
}

// DELETE handler: runs inside onRecordDeleteRequest.
// Before e.next(): snapshot the row about to be deleted.
// After e.next(): log with old_data.
function buildDeleteHandler(collection, fields) {
  let body = buildHelpers(collection, fields);
  body += "var actorId=(e.auth&&e.auth.id)||null;\n";
  body += "var od=snap(e.record);\n";
  body += "e.next();\n";
  body += "log(e.record,'DELETE',od,null,actorId);\n";
  return new Function("e", body);
}

// Register one request-level handler per (collection, action).
for (const collection of Object.keys(TRACKED)) {
  const fields = TRACKED[collection].filter(function(f) { return FIELDS_DENYLIST.indexOf(f) === -1; });
  onRecordCreateRequest(buildCreateHandler(collection, fields), collection);
  onRecordUpdateRequest(buildUpdateHandler(collection, fields), collection);
  onRecordDeleteRequest(buildDeleteHandler(collection, fields), collection);
}
