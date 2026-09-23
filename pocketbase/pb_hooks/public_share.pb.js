/// <reference path="../pb_data/types.d.ts" />
// POST /api/share/{token} — public endpoint serving a shared project payload.
// Body: { password: string }
// Token is matched via sha256 hash; password attempts rate-limited per token
// through $app.store() (survives JSVM handler scoping).

routerAdd("POST", "/api/share/{token}", (e) => {
  const token = e.request.pathValue("token");
  const body = e.requestInfo().body;
  const password = body.password || "";

  const tokenHash = $security.sha256(token);

  // --- basic rate limiting: 20 FAILED password attempts / 10min per token ---
  const storeKey = "share_rl_" + tokenHash.slice(0, 24);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const attempts = $app
    .store()
    .get(storeKey);
  const state = attempts && typeof attempts === "object"
    ? attempts
    : { reset: 0, count: 0 };
  if (now > state.reset) {
    state.reset = now + windowMs;
    state.count = 0;
  }
  if (state.count >= 20) {
    throw new TooManyRequestsError("Too many attempts, try again later");
  }

  let link = null;
  try {
    link = $app.findFirstRecordByFilter(
      "shared_project_links",
      `token_hash="${tokenHash}"`,
    );
  } catch (_) {
    throw new NotFoundError("Invalid access token or link not found");
  }

  const expiresAt = link.get("expires_at");
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    throw new ForbiddenError("Share link has expired");
  }

  const projectId = link.get("project_id");

  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Invalid access token or link not found");
  }
  const deletedAt = project.getString("deleted_at");
  if (deletedAt && deletedAt !== "") {
    throw new NotFoundError("Invalid access token or link not found");
  }

  if (!link.validatePassword(password)) {
    state.count += 1;
    $app.store().set(storeKey, state);
    throw new ForbiddenError("Incorrect password");
  }

  const listChildren = (collectionName) => {
    try {
      const rows = $app.findRecordsByFilter(
        collectionName,
        `project_id="${projectId}"`,
        "",
        0,
        0,
      );
      return rows.map((r) => JSON.parse(JSON.stringify(r.publicExport())));
    } catch (_) {
      return [];
    }
  };

  const safeAdd = (...args) => Math.round(args.reduce((s, v) => s + (Number(v) || 0), 0));
  const safeMult = (...args) => Math.round(args.reduce((p, v) => p * (Number(v) || 0), 1));

  const rawMaterials = listChildren("materials");
  const rawLabor = listChildren("labor_items");
  const rawEquipment = listChildren("equipment_items");
  const rawAdditional = listChildren("additional_costs");
  const rawRisks = listChildren("risks");
  const rawGroups = listChildren("project_groups");

  let mt = 0;
  for (let i = 0; i < rawMaterials.length; i++) {
    const q = Number(rawMaterials[i].quantity) || 0;
    const p = Number(rawMaterials[i].unit_price) || 0;
    mt = safeAdd(mt, safeMult(q, p));
  }

  let lt = 0;
  for (let i = 0; i < rawLabor.length; i++) {
    const nw = Number(rawLabor[i].number_of_workers) || 0;
    const dr = Number(rawLabor[i].daily_rate) || 0;
    const td = Number(rawLabor[i].total_days) || 0;
    lt = safeAdd(lt, safeMult(nw, dr, td));
  }

  let eq = 0;
  for (let i = 0; i < rawEquipment.length; i++) {
    const q = Number(rawEquipment[i].quantity) || 0;
    const c = Number(rawEquipment[i].cost_per_period) || 0;
    const isPurchase =
      String(rawEquipment[i].rental_or_purchase || "").toLowerCase() ===
      "purchase";
    const d = isPurchase ? 1 : Number(rawEquipment[i].usage_duration) || 0;
    const m = Number(rawEquipment[i].maintenance_cost) || 0;
    const f = Number(rawEquipment[i].fuel_cost) || 0;
    eq = safeAdd(eq, safeMult(q, c, d), m, f);
  }

  let ad = 0;
  for (let i = 0; i < rawAdditional.length; i++) {
    ad = safeAdd(ad, Number(rawAdditional[i].amount) || 0);
  }

  let rc = 0;
  for (let i = 0; i < rawRisks.length; i++) {
    const prob = rawRisks[i].probability;
    const impact = Number(rawRisks[i].impact_amount) || 0;
    const factor =
      Number(rawRisks[i].probability_weight) || (prob === "high" ? 0.5 : prob === "medium" ? 0.3 : prob === "low" ? 0.1 : 0);
    rc = safeAdd(
      rc,
      Number(rawRisks[i].contingency_amount) || safeMult(factor, impact),
    );
  }

  let fs = project.get("financial_settings");
  if (typeof fs === "string") {
    try {
      fs = JSON.parse(fs);
    } catch (_) {
      fs = {};
    }
  }
  if (!fs || typeof fs !== "object") fs = {};

  const locationFactor = Number(fs.location_factor) || 1;
  const mtAdj = Math.round(mt * locationFactor);
  const ltAdj = Math.round(lt * locationFactor);
  const eqAdj = Math.round(eq * locationFactor);

  const directC = mtAdj + ltAdj + eqAdj + ad;
  const directBaseC = mt + lt + eq + ad;
  const overheadC = Math.round(
    (directC * (Number(fs.overhead_percent) || 0)) / 100,
  );
  const flatContingencyC = Math.round(
    (directC * (Number(fs.contingency_percent) || 0)) / 100,
  );
  const riskContingencyC = Math.round(rc);

  const basis = fs.contingency_basis || "flat";
  let contingencyC = flatContingencyC;
  if (basis === "risk_register") {
    contingencyC = riskContingencyC;
  } else if (basis === "combined") {
    contingencyC = flatContingencyC + riskContingencyC;
  }

  const primeC = directC + overheadC + contingencyC;
  const markupC = Math.round((primeC * (Number(fs.markup_percent) || 0)) / 100);
  const bidC = primeC + markupC;
  const taxC = Math.round((bidC * (Number(fs.tax_percent) || 0)) / 100);
  const totalC = bidC + taxC;

  const computedFinancials = {
    materialsTotal: mtAdj,
    laborTotal: ltAdj,
    equipmentTotal: eqAdj,
    additionalTotal: ad,
    directCostsBase: directBaseC,
    locationAdjustmentAmount: (directC - directBaseC),
    directCosts: directC,
    overheadAmount: overheadC,
    contingencyAmount: contingencyC,
    contingencyBasis: basis,
    flatContingencyAmount: flatContingencyC,
    riskContingencyAmount: riskContingencyC,
    primeCost: primeC,
    markupAmount: markupC,
    bidPrice: bidC,
    taxAmount: taxC,
    grandTotal: totalC,
      grossMarginPercent: grossMarginPercent
    };

  const pExp = JSON.parse(JSON.stringify(project.publicExport()));
  const sanitizedProject = {
    id: pExp.id,
    name: pExp.name,
    description: pExp.description || "",
    type: pExp.type || "",
    size: pExp.size || null,
    size_unit: pExp.size_unit || "",
    location: pExp.location || "",
    client_requirements: pExp.client_requirements || "",
    duration_days: pExp.duration_days || 0,
    duration_unit: pExp.duration_unit || "days",
    currency: pExp.currency || "USD",
    created: pExp.created,
    updated: pExp.updated,
  };

  const sanitizeMaterial = (m) => ({
    id: m.id,
    project_id: m.project_id,
    group_id: m.group_id || null,
    name: m.name,
    description: m.description || "",
    quantity: Number(m.quantity) || 0,
    unit: m.unit || "",
    unit_price: Number(m.unit_price) || 0,
    created: m.created,
    updated: m.updated,
  });

  const sanitizeLabor = (l) => ({
    id: l.id,
    project_id: l.project_id,
    group_id: l.group_id || null,
    worker_type: l.worker_type || "",
    description: l.description || "",
    number_of_workers: Number(l.number_of_workers) || 0,
    daily_rate: Number(l.daily_rate) || 0,
    total_days: Number(l.total_days) || 0,
    created: l.created,
    updated: l.updated,
  });

  const sanitizeEquipment = (eqItem) => ({
    id: eqItem.id,
    project_id: eqItem.project_id,
    group_id: eqItem.group_id || null,
    name: eqItem.name,
    type: eqItem.type || "",
    rental_or_purchase: eqItem.rental_or_purchase || "rental",
    quantity: Number(eqItem.quantity) || 0,
    cost_per_period: Number(eqItem.cost_per_period) || 0,
    period_unit: eqItem.period_unit || "day",
    usage_duration: Number(eqItem.usage_duration) || 0,
    maintenance_cost: Number(eqItem.maintenance_cost) || 0,
    fuel_cost: Number(eqItem.fuel_cost) || 0,
    created: eqItem.created,
    updated: eqItem.updated,
  });

  const sanitizeAdditional = (a) => ({
    id: a.id,
    project_id: a.project_id,
    group_id: a.group_id || null,
    category: a.category || "",
    description: a.description || "",
    amount: Number(a.amount) || 0,
    created: a.created,
    updated: a.updated,
  });

  const sanitizeGroup = (g) => ({
    id: g.id,
    project_id: g.project_id,
    name: g.name,
    sort_order: Number(g.sort_order) || 0,
    created: g.created,
    updated: g.updated,
  });

  return e.json(200, {
    project: sanitizedProject,
    materials: rawMaterials.map(sanitizeMaterial),
    labor: rawLabor.map(sanitizeLabor),
    equipment: rawEquipment.map(sanitizeEquipment),
    additional: rawAdditional.map(sanitizeAdditional),
    risks: [],
    groups: rawGroups.map(sanitizeGroup),
    financials: computedFinancials,
    expires_at: expiresAt || null,
    success: true,
  });
});
