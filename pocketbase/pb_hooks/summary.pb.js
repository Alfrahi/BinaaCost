routerAdd("GET", "/api/projects/{id}/summary", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const projectId = e.request.pathValue("id");

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
        `project_id="${projectId}" && shared_with_user_id="${auth.id}"`
      );
    } catch (_) {
      hasShare = false;
    }
    if (!hasShare) throw new ForbiddenError("Access denied");
  }

  const getSum = (query) => {
    try {
      const result = new DynamicModel({ total: 0 });
      $app.db().newQuery(query).bind({ id: projectId }).one(result);
      return result.total || 0;
    } catch (err) {
      return 0;
    }
  };

  const mt = getSum("SELECT SUM(quantity * unit_price) as total FROM materials WHERE project_id = {:id}");
  
  const lt = getSum("SELECT SUM(number_of_workers * daily_rate * total_days) as total FROM labor_items WHERE project_id = {:id}");
  
  const eqQuery = `
    SELECT SUM(
      (quantity * cost_per_period * CASE WHEN LOWER(rental_or_purchase) = 'purchase' THEN 1 ELSE COALESCE(usage_duration, 0) END)
      + COALESCE(maintenance_cost, 0) + COALESCE(fuel_cost, 0)
    ) as total FROM equipment_items WHERE project_id = {:id}
  `;
  const eq = getSum(eqQuery);

  const ad = getSum("SELECT SUM(amount) as total FROM additional_costs WHERE project_id = {:id}");

  const risksQuery = `
    SELECT SUM(
      CASE WHEN contingency_amount > 0 THEN contingency_amount 
      ELSE 
        CASE LOWER(probability)
          WHEN 'high' THEN 0.5
          WHEN 'medium' THEN 0.3
          WHEN 'low' THEN 0.1
          ELSE 0
        END * impact_amount
      END
    ) as total FROM risks WHERE project_id = {:id}
  `;
  const rc = getSum(risksQuery);

  let isFinalized = false;
  try {
    const vResult = new DynamicModel({ cnt: 0 });
    $app.db().newQuery("SELECT COUNT(id) as cnt FROM project_versions WHERE project_id = {:id} AND is_final = true").bind({ id: projectId }).one(vResult);
    isFinalized = vResult.cnt > 0;
  } catch (err) { }

  return e.json(200, {
    totals: {
      materialsTotal: mt,
      laborTotal: lt,
      equipmentTotal: eq,
      additionalTotal: ad,
      riskContingency: rc
    },
    isFinalized: isFinalized
  });
});
