/// <reference path="../pb_data/types.d.ts" />
// P1-DATA: Database integrity constraints
// 1. Add min: 0 constraints to numeric quantity, rate, and price fields across all collections
//    to prevent negative values from bypassing UI and corrupting financial totals.
// 2. Add database-level UNIQUE compound index on cost_database_items (database_id, csi_code)
//    to eliminate TOCTOU race conditions during concurrent imports.

migrate((app) => {
  // 1. Numeric constraints: min: 0 on all financial/quantity fields
  const TARGET_FIELDS = {
    materials: ["quantity", "unit_price"],
    labor_items: ["number_of_workers", "daily_rate", "total_days", "total_cost"],
    equipment_items: ["quantity", "cost_per_period", "usage_duration", "maintenance_cost", "fuel_cost", "total_cost"],
    additional_costs: ["amount"],
    risks: ["impact_amount", "contingency_amount"],
    cost_database_items: ["unit_price"],
    location_adjustments: ["multiplier"],
    cost_assembly_items: ["quantity", "unit_price"],
    library_materials: ["unit_price"],
    library_labor: ["daily_rate"],
    library_equipment: ["cost_per_period"],
    projects: ["duration_days"],
  };

  for (const [collName, fieldNames] of Object.entries(TARGET_FIELDS)) {
    let coll = null;
    try {
      coll = app.findCollectionByNameOrId(collName);
    } catch (_) {
      continue;
    }
    if (!coll) continue;

    let modified = false;
    for (const fName of fieldNames) {
      const field = coll.fields.getByName(fName);
      if (field) {
        field.min = 0;
        modified = true;
      }
    }
    if (modified) {
      app.save(coll);
      console.log(`[migration] Added min: 0 constraints to ${collName}: ${fieldNames.join(", ")}`);
    }
  }

  // 2. Unique compound index on cost_database_items (database_id, csi_code)
  const cdi = app.findCollectionByNameOrId("cost_database_items");
  if (cdi) {
    // Deduplicate any existing duplicate (database_id, csi_code) pairs before adding unique index
    const allRows = app.findRecordsByFilter("cost_database_items", "", "-created", 0, 0);
    const seen = {};
    let dupesRemoved = 0;
    for (const row of allRows) {
      const key = `${row.get("database_id")}:::${row.get("csi_code")}`;
      if (seen[key]) {
        app.delete(row);
        dupesRemoved++;
      } else {
        seen[key] = true;
      }
    }
    if (dupesRemoved > 0) {
      console.log(`[migration] Removed ${dupesRemoved} duplicate rows in cost_database_items`);
    }

    // Replace old non-unique index with unique index
    cdi.indexes = (cdi.indexes || []).filter((idx) => !idx.includes("idx_cdi_db_csi"));
    cdi.indexes.push("CREATE UNIQUE INDEX idx_cdi_db_csi ON cost_database_items (database_id, csi_code)");
    app.save(cdi);
    console.log("[migration] Created UNIQUE index idx_cdi_db_csi on cost_database_items (database_id, csi_code)");
  }
}, (app) => {
  const cdi = app.findCollectionByNameOrId("cost_database_items");
  if (cdi) {
    cdi.indexes = (cdi.indexes || []).filter((idx) => !idx.includes("idx_cdi_db_csi"));
    cdi.indexes.push("CREATE INDEX idx_cdi_db_csi ON cost_database_items (database_id, csi_code)");
    app.save(cdi);
  }
});
