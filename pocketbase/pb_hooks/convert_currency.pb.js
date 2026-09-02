/// <reference path="../pb_data/types.d.ts" />
// POST /api/projects/{id}/convert-currency — port of convert_project_currency
// RPC. Transactional: scales all monetary fields by rate(new)/rate(old),
// then flips project.currency.

routerAdd("POST", "/api/projects/{id}/convert-currency", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const projectId = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const oldCurrency = body.old_currency;
  const newCurrency = body.new_currency;
  if (!oldCurrency || !newCurrency || oldCurrency === newCurrency) {
    throw new BadRequestError("Provide distinct old_currency and new_currency");
  }

  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Project not found");
  }
  if (project.get("user_id") !== auth.id) {
    throw new ForbiddenError("Only the owner can convert currency");
  }

  // rate lookup (rate_to_usd)
  const findRate = (code) => {
    const r = $app.findFirstRecordByFilter(
      "currency_rates",
      `currency_code="${code.toUpperCase()}"`,
    );
    return r.get("rate_to_usd");
  };
  const rateOld = findRate(oldCurrency);
  const rateNew = findRate(newCurrency);
  const factor = rateNew / rateOld;

  const TABLE_FIELDS = {
    materials: ["unit_price"],
    labor_items: ["daily_rate"],
    equipment_items: ["cost_per_period", "maintenance_cost", "fuel_cost"],
    additional_costs: ["amount"],
    risks: ["impact_amount", "contingency_amount"],
  };

  // stage updates then apply inside a transaction
  $app.runInTransaction((txApp) => {
    for (const coll of Object.keys(TABLE_FIELDS)) {
      const rows = txApp.findRecordsByFilter(
        coll,
        `project_id="${projectId}"`,
        "",
        0,
        0,
      );
      for (const row of rows) {
        for (const f of TABLE_FIELDS[coll]) {
          const cur = row.get(f);
          if (typeof cur === "number") {
            row.set(f, Math.round(cur * factor * 100) / 100);
          }
        }
        txApp.save(row);
      }
    }

    const p = txApp.findRecordById("projects", projectId);
    p.set("currency", newCurrency);
    txApp.save(p);
  });

  return e.json(200, { success: true, factor });
});
