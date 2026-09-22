/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/projects/:id/clone", (c) => {
  const user = c.get("authRecord");
  if (!user) {
    throw new UnauthorizedError("Must be logged in to clone projects.");
  }

  const projectId = c.pathParam("id");
  const data = $apis.requestInfo(c).data;
  const customName = data.customName || "";
  const copySuffix = data.copySuffix || "Copy";

  let newProject = null;

  $app.runInTransaction((txApp) => {
    // 1. Fetch source project record
    const source = txApp.findRecordById("projects", projectId);

    // Determine clone name
    const newName = customName.trim() || `${source.get("name")} (${copySuffix})`;

    // 2. Create the cloned project
    const projectsCollection = txApp.findCollectionByNameOrId("projects");
    newProject = new Record(projectsCollection);
    
    newProject.set("name", newName);
    newProject.set("description", source.get("description"));
    newProject.set("type", source.get("type"));
    newProject.set("size", source.get("size"));
    newProject.set("size_unit", source.get("size_unit"));
    newProject.set("location", source.get("location"));
    newProject.set("client_requirements", source.get("client_requirements"));
    newProject.set("duration_days", source.get("duration_days"));
    newProject.set("duration_unit", source.get("duration_unit"));
    newProject.set("currency", source.get("currency"));
    newProject.set("financial_settings", source.get("financial_settings"));
    newProject.set("financial_settings_confirmed", source.get("financial_settings_confirmed"));
    newProject.set("user_id", user.id);
    newProject.set("version", 1);

    txApp.save(newProject);
    const newProjectId = newProject.id;

    // 3 & 4. Clone project_groups and map old groupId to new groupId
    const groups = txApp.findRecordsByFilter("project_groups", `project_id="${projectId}"`, "sort_order");
    const groupMap = {};
    const projectGroupsCollection = txApp.findCollectionByNameOrId("project_groups");

    for (const group of groups) {
      const newGroup = new Record(projectGroupsCollection);
      newGroup.set("name", group.get("name"));
      newGroup.set("color", group.get("color"));
      newGroup.set("sort_order", group.get("sort_order"));
      newGroup.set("project_id", newProjectId);
      newGroup.set("user_id", user.id);
      newGroup.set("version", 1);
      txApp.save(newGroup);
      groupMap[group.id] = newGroup.id;
    }

    // 5. Clone line items
    const collectionsToClone = [
      { name: "materials", fields: ["name", "description", "quantity", "unit", "unit_price", "supplier_options"] },
      { name: "labor_items", fields: ["worker_type", "description", "number_of_workers", "daily_rate", "total_days", "total_cost"] },
      { name: "equipment_items", fields: ["name", "type", "rental_or_purchase", "quantity", "cost_per_period", "period_unit", "usage_duration", "maintenance_cost", "fuel_cost", "total_cost"] },
      { name: "additional_costs", fields: ["category", "description", "amount"] },
      { name: "risks", fields: ["name", "description", "category", "impact_amount", "probability", "contingency_amount", "mitigation_notes"] }
    ];

    for (const collInfo of collectionsToClone) {
      const items = txApp.findRecordsByFilter(collInfo.name, `project_id="${projectId}"`);
      const collection = txApp.findCollectionByNameOrId(collInfo.name);

      for (const item of items) {
        const newItem = new Record(collection);
        for (const field of collInfo.fields) {
          newItem.set(field, item.get(field));
        }
        const oldGroupId = item.get("group_id");
        newItem.set("group_id", oldGroupId ? (groupMap[oldGroupId] || "") : "");
        newItem.set("project_id", newProjectId);
        newItem.set("user_id", user.id);
        newItem.set("version", 1);
        txApp.save(newItem);
      }
    }
  });

  return c.json(200, newProject);
});
