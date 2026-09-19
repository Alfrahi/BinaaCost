/// <reference path="../pb_data/types.d.ts" />
// DB-001: Add missing high-frequency foreign key & filter indexes on child
// collections and audit logs.
migrate((app) => {
  const indexesToAdd = [
    { coll: "materials", index: "CREATE INDEX idx_materials_project ON materials (project_id)" },
    { coll: "labor_items", index: "CREATE INDEX idx_labor_items_project ON labor_items (project_id)" },
    { coll: "equipment_items", index: "CREATE INDEX idx_equipment_items_project ON equipment_items (project_id)" },
    { coll: "additional_costs", index: "CREATE INDEX idx_additional_costs_project ON additional_costs (project_id)" },
    { coll: "risks", index: "CREATE INDEX idx_risks_project ON risks (project_id)" },
    { coll: "comments", index: "CREATE INDEX idx_comments_project ON comments (project_id)" },
    { coll: "project_groups", index: "CREATE INDEX idx_project_groups_project ON project_groups (project_id)" },
    { coll: "project_versions", index: "CREATE INDEX idx_project_versions_project ON project_versions (project_id)" },
    { coll: "project_shares", index: "CREATE INDEX idx_project_shares_proj_user ON project_shares (project_id, shared_with_user_id)" },
    { coll: "cost_assembly_items", index: "CREATE INDEX idx_cost_assembly_items_assembly ON cost_assembly_items (assembly_id)" },
    { coll: "audit_logs", index: "CREATE INDEX idx_audit_logs_table_created ON audit_logs (table_name, created)" },
  ];

  for (const item of indexesToAdd) {
    const collection = app.findCollectionByNameOrId(item.coll);
    const existing = collection.indexes || [];
    const indexNameMatch = item.index.match(/INDEX\s+`?([a-zA-Z0-9_]+)`?/i);
    const indexName = indexNameMatch ? indexNameMatch[1] : "";
    if (!existing.some((idx) => idx.includes(indexName))) {
      collection.indexes = [...existing, item.index];
      app.save(collection);
      console.log(`Added index ${indexName} on ${item.coll}`);
    }
  }
});
