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

  // rate lookup (rate_to_usd) — throw a clean 400 on missing/invalid rates
  // rather than a raw 404 (missing record) or Infinity (0 rate).
  const findRate = (code) => {
    let r;
    try {
      r = $app.findFirstRecordByFilter(
        "currency_rates",
        `currency_code="${code.toUpperCase()}"`,
      );
    } catch (_) {
      throw new BadRequestError(`Unknown currency code: ${code}`);
    }
    const rate = r.get("rate_to_usd");
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BadRequestError(`Invalid currency rate for ${code}`);
    }
    return rate;
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

  const safeProjectId = projectId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // stage updates then apply inside a transaction
  $app.runInTransaction((txApp) => {
    for (const coll of Object.keys(TABLE_FIELDS)) {
      const rows = txApp.findRecordsByFilter(
        coll,
        `project_id="${safeProjectId}"`,
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
        if (coll === "labor_items") {
          const workers = Number(row.get("number_of_workers")) || 0;
          const rate = Number(row.get("daily_rate")) || 0;
          const days = Number(row.get("total_days")) || 0;
          row.set("total_cost", Math.round(workers * rate * days * 100) / 100);
        } else if (coll === "equipment_items") {
          const qty = Number(row.get("quantity")) || 0;
          const costPerPeriod = Number(row.get("cost_per_period")) || 0;
          const duration = Number(row.get("usage_duration")) || 0;
          const maintenance = Number(row.get("maintenance_cost")) || 0;
          const fuel = Number(row.get("fuel_cost")) || 0;
          const base = Math.round(qty * costPerPeriod * duration * 100) / 100;
          row.set("total_cost", Math.round((base + maintenance + fuel) * 100) / 100);
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
