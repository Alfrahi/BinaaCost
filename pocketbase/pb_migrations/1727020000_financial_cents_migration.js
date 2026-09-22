migrate((app) => {
  const collections = [
    { name: "materials", fields: ["unit_price"], hasVersion: true },
    { name: "labor_items", fields: ["daily_rate"], hasVersion: true },
    { name: "equipment_items", fields: ["cost_per_period", "maintenance_cost", "fuel_cost"], hasVersion: true },
    { name: "additional_costs", fields: ["amount"], hasVersion: true },
    { name: "risks", fields: ["impact_amount", "contingency_amount"], hasVersion: true },
    { name: "library_materials", fields: ["unit_price"], hasVersion: false }
  ];

  for (const coll of collections) {
    const setClauses = coll.fields.map(f => `${f} = ROUND(IFNULL(${f}, 0) * 100)`).join(", ");
    const versionClause = coll.hasVersion ? ", version = version + 1" : "";
    app.db().newQuery(`UPDATE ${coll.name} SET ${setClauses}${versionClause}`).execute();
  }
}, (app) => {
  const collections = [
    { name: "materials", fields: ["unit_price"], hasVersion: true },
    { name: "labor_items", fields: ["daily_rate"], hasVersion: true },
    { name: "equipment_items", fields: ["cost_per_period", "maintenance_cost", "fuel_cost"], hasVersion: true },
    { name: "additional_costs", fields: ["amount"], hasVersion: true },
    { name: "risks", fields: ["impact_amount", "contingency_amount"], hasVersion: true },
    { name: "library_materials", fields: ["unit_price"], hasVersion: false }
  ];

  for (const coll of collections) {
    const setClauses = coll.fields.map(f => `${f} = IFNULL(${f}, 0) / 100.0`).join(", ");
    const versionClause = coll.hasVersion ? ", version = version + 1" : "";
    app.db().newQuery(`UPDATE ${coll.name} SET ${setClauses}${versionClause}`).execute();
  }
});
