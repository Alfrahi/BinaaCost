/// <reference path="../pb_data/types.d.ts" />
// POST /api/projects/{id}/simulate — port of simulate-project-scenario.
// JSVM handlers must be self-contained: helpers declared within the handler
// body (route callbacks can't close over file-scope code).

routerAdd("POST", "/api/projects/{id}/simulate", (e) => {
  // ---- local math helpers (plain JS, round-half-up at 2dp) ----
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const safeAdd = (...args) => r2(args.reduce((s, v) => s + (Number(v) || 0), 0));
  const safeMult = (...args) => r2(args.reduce((p, v) => p * (Number(v) || 0), 1));
  const safeDiv = (a, b, decimals = 2) => {
    if (!b) return 0;
    const f = Math.pow(10, decimals);
    return Math.round(((a / b) + Number.EPSILON) * f) / f;
  };

  const itemCost = (coll, item) => {
    if (coll === "materials") return safeMult(item.quantity, item.unit_price);
    if (coll === "labor_items")
      return safeMult(item.number_of_workers, item.daily_rate, item.total_days);
    if (coll === "equipment_items") {
      const base = safeMult(item.quantity, item.cost_per_period, item.usage_duration);
      return safeAdd(base, item.maintenance_cost || 0, item.fuel_cost || 0);
    }
    if (coll === "additional_costs") return item.amount || 0;
    return 0;
  };

  const catTotal = (coll, items) => r2(items.reduce((s, it) => safeAdd(s, itemCost(coll, it)), 0));

  const runFinancials = (mt, lt, eq, ad, s) => {
    if (!s) s = {};
    // integer-cents arithmetic: multiply to cents, operate on integers,
    // divide once at the end. No intermediate rounding, matching
    // src/logic/financials.ts (decimal.js) exactly.
    const toCents = (n) => Math.round((Number(n) || 0) * 100);
    const directC = toCents(mt) + toCents(lt) + toCents(eq) + toCents(ad);
    const overheadC = Math.round(directC * (Number(s.overhead_percent) || 0) / 100);
    const contingencyC = Math.round(directC * (Number(s.contingency_percent) || 0) / 100);
    const primeC = directC + overheadC + contingencyC;
    const markupC = Math.round(primeC * (Number(s.markup_percent) || 0) / 100);
    const bidC = primeC + markupC;
    const taxC = Math.round(bidC * (Number(s.tax_percent) || 0) / 100);
    const totalC = bidC + taxC;
    return {
      materialsTotal: mt, laborTotal: lt, equipmentTotal: eq, additionalTotal: ad,
      directCosts: directC / 100,
      overheadAmount: overheadC / 100,
      contingencyAmount: contingencyC / 100,
      primeCost: primeC / 100,
      markupAmount: markupC / 100,
      bidPrice: bidC / 100,
      taxAmount: taxC / 100,
      grandTotal: totalC / 100,
    };
  };

  const applyAdjust = (items, field, adjType, val, filterFn) =>
    items.map((it) => {
      if (filterFn && !filterFn(it)) return it;
      const cur = Number(it[field]) || 0;
      let next = cur;
      if (adjType === "percentage_increase") next = cur * (1 + val / 100);
      else if (adjType === "fixed_increase") next = cur + val;
      return { ...it, [field]: r2(next) };
    });

  const nameFilter = (field) => (filter, item) => {
    if (!filter || !filter.name_contains) return true;
    return String(item[field] || "").toLowerCase().includes(filter.name_contains.toLowerCase());
  };

  const workerFilter = (filter, it) =>
    !filter ||
    !filter.worker_type_contains ||
    String(it.worker_type || "").toLowerCase().includes(filter.worker_type_contains.toLowerCase());

  // ---- request handling ----
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const projectId = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const scenario = body.scenario;
  if (!scenario || !scenario.impact_rules) {
    throw new BadRequestError("Missing scenario definition");
  }

  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Project not found");
  }
  const isOwner = project.get("user_id") === auth.id;
  const isSuperAdmin = auth.get("role") === "super_admin";
  if (!isOwner && !isSuperAdmin) {
    let hasShare = true;
    try {
      $app.findFirstRecordByFilter(
        "project_shares",
        `project_id="${projectId}" && shared_with_user_id="${auth.id}"`,
      );
    } catch (_) {
      hasShare = false;
    }
    if (!hasShare) throw new ForbiddenError("Access denied");
  }

  // publicExport() returns a Go proxy with index-keyed entries; clone through
  // record.get() per-row? publicExport fine for json only with plain fields —
  // use record.get for each row to normalize safely.
  const orig = {};
  const tables = ["materials", "labor_items", "equipment_items", "additional_costs", "risks"];
  for (const c of tables) {
    const rows = $app.findRecordsByFilter(c, `project_id="${projectId}"`, "", 0, 0);
    orig[c] = rows.map((r) => JSON.parse(JSON.stringify(r.publicExport())));
  }

  let simMaterials = JSON.parse(JSON.stringify(orig.materials));
  let simLabor = JSON.parse(JSON.stringify(orig.labor_items));
  let simEquipment = JSON.parse(JSON.stringify(orig.equipment_items));
  let simAdditional = JSON.parse(JSON.stringify(orig.additional_costs));
  const simRisks = JSON.parse(JSON.stringify(orig.risks));

  const rawStr = project.getString("financial_settings");
  const fin = rawStr ? JSON.parse(rawStr) : {};

  for (const rule of scenario.impact_rules || []) {
    const itemType = rule.item_type;
    const field = rule.field;
    const adjType = rule.adjustment_type;
    const val = Number(rule.value) || 0;
    const filter = rule.filter;

    if (itemType === "materials" && field === "unit_price") {
      simMaterials = applyAdjust(simMaterials, "unit_price", adjType, val,
        (it) => nameFilter("name")(filter, it));
    } else if (itemType === "labor" && field === "daily_rate") {
      simLabor = applyAdjust(simLabor, "daily_rate", adjType, val,
        (it) => workerFilter(filter, it));
    } else if (itemType === "labor" && field === "total_days" && adjType === "fixed_increase") {
      simLabor = applyAdjust(simLabor, "total_days", adjType, val,
        (it) => workerFilter(filter, it));
    } else if (itemType === "equipment") {
      if (["cost_per_period", "maintenance_cost", "fuel_cost"].indexOf(field) !== -1) {
        simEquipment = applyAdjust(simEquipment, field, adjType, val,
          (it) => nameFilter("name")(filter, it));
      } else if (field === "usage_duration" && adjType === "fixed_increase") {
        simEquipment = applyAdjust(simEquipment, field, adjType, val,
          (it) => nameFilter("name")(filter, it));
      }
    } else if (itemType === "additional" && field === "amount") {
      simAdditional = applyAdjust(simAdditional, "amount", adjType, val,
        (it) => !filter || !filter.category_is || it.category === filter.category_is);
    } else if (itemType === "risks" && field === "realize_risk_impact" && adjType === "by_id") {
      const risk = simRisks.find((r) => r.id === rule.value);
      if (risk) {
        simAdditional.push({
          id: "sim-" + Math.random().toString(36).slice(2, 11),
          project_id: projectId,
          user_id: null,
          category: "Simulated Risk Impact",
          description: "Impact of risk: " + (risk.description || ""),
          amount: risk.impact_amount || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else if (itemType === "financial_settings" && adjType === "fixed_increase") {
      if (["overhead_percent", "markup_percent", "tax_percent", "contingency_percent"].indexOf(field) !== -1) {
        fin[field] = r2((Number(fin[field]) || 0) + val);
      }
    }
  }

  const currency = project.get("currency");
  const baseSettings = Object.assign({}, fin);

  const origTotals = {
    materialsTotal: catTotal("materials", orig.materials),
    laborTotal: catTotal("labor_items", orig.labor_items),
    equipmentTotal: catTotal("equipment_items", orig.equipment_items),
    additionalTotal: catTotal("additional_costs", orig.additional_costs),
  };
  const simTotals = {
    materialsTotal: catTotal("materials", simMaterials),
    laborTotal: catTotal("labor_items", simLabor),
    equipmentTotal: catTotal("equipment_items", simEquipment),
    additionalTotal: catTotal("additional_costs", simAdditional),
  };

  return e.json(200, {
    original: {
      currency,
      financials: runFinancials(
        origTotals.materialsTotal,
        origTotals.laborTotal,
        origTotals.equipmentTotal,
        origTotals.additionalTotal,
        baseSettings,
      ),
      materials: orig.materials,
      labor: orig.labor_items,
      equipment: orig.equipment_items,
      additional: orig.additional_costs,
      risks: orig.risks,
      financial_settings: baseSettings,
    },
    simulated: {
      currency,
      financials: runFinancials(
        simTotals.materialsTotal,
        simTotals.laborTotal,
        simTotals.equipmentTotal,
        simTotals.additionalTotal,
        fin,
      ),
      materials: simMaterials,
      labor: simLabor,
      equipment: simEquipment,
      additional: simAdditional,
      risks: simRisks,
      financial_settings: fin,
    },
  });
});
