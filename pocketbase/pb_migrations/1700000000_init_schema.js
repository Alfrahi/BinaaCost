/// <reference path="../pb_data/types.d.ts" />
// PocketBase schema for BinaaCost (Supabase -> PB, plan §6/§7).
// Field names mirror Supabase columns so existing app types/queries map 1:1.
migrate((app) => {
  console.log("=== MIGRATION START ===");
  // Built-in users auth collection exists (created by PocketBase init).
  // Modify it: add custom fields and update rules.
  const users = app.findCollectionByNameOrId("users");
  console.log("Found users:", users.id, users.name, users.type);

  // Try using Field constructor if available
  const customFields = [
    new Field({ name: "role", type: "select", values: ["user", "super_admin"], maxSelect: 1, required: false }),
    new Field({ name: "first_name", type: "text" }),
    new Field({ name: "last_name", type: "text" }),
    new Field({ name: "company_name", type: "text" }),
    new Field({ name: "company_website", type: "text" }),
    new Field({ name: "notification_prefs", type: "json" }),
  ];
  // Keep existing fields and append custom ones
  users.fields = [...users.fields, ...customFields];
  users.listRule = 'id = @request.auth.id || @request.auth.role = "super_admin"';
  users.viewRule = 'id = @request.auth.id || @request.auth.role = "super_admin"';
  users.createRule = '@request.body.role = "" || @request.body.role = "user"';
  users.updateRule = 'id = @request.auth.id && @request.body.role:isset = false';
  console.log("Saving users...");
  app.save(users);
  console.log("Users saved");

  console.log("=== MIGRATION END ===");
  // Rules applied in the final pass: share-aware rules reference
  // project_shares, which does not exist yet at creation time.
  const projects = new Collection({
    type: "base",
    name: "projects",
    indexes: ["CREATE INDEX idx_projects_user_deleted ON projects (user_id, deleted_at)"],
    fields: [
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "type", type: "text" },
      { name: "size", type: "text" },
      { name: "location", type: "text" },
      { name: "client_requirements", type: "text" },
      { name: "duration_days", type: "number" },
      { name: "size_unit", type: "text" },
      { name: "duration_unit", type: "text" },
      { name: "currency", type: "text", required: true },
      { name: "financial_settings", type: "json" },
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: false, maxSelect: 1, required: true },
      { name: "deleted_at", type: "date" },
    ],
  });
  app.save(projects);

  // --- project_groups -----------------------------------------------------
  const projectGroups = new Collection({
    type: "base",
    name: "project_groups",
    fields: [
      { name: "project_id", type: "relation", collectionId: projects.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "name", type: "text", required: true },
      { name: "sort_order", type: "number", onlyInt: true },
    ],
  });
  app.save(projectGroups);

  // --- project child item tables -------------------------------------------
  const childBase = (withGroup) => [
    { name: "project_id", type: "relation", collectionId: projects.id, cascadeDelete: true, maxSelect: 1, required: true },
    { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
    ...(withGroup
      ? [{ name: "group_id", type: "relation", collectionId: projectGroups.id, cascadeDelete: false, maxSelect: 1 }]
      : []),
  ];

  app.save(new Collection({
    type: "base",
    name: "materials",
    fields: [
      ...childBase(true),
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "quantity", type: "number", required: true },
      { name: "unit", type: "text" },
      { name: "unit_price", type: "number" },
      { name: "supplier_options", type: "json" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "labor_items",
    fields: [
      ...childBase(true),
      { name: "worker_type", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "number_of_workers", type: "number" },
      { name: "daily_rate", type: "number" },
      { name: "total_days", type: "number" },
      { name: "total_cost", type: "number" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "equipment_items",
    fields: [
      ...childBase(true),
      { name: "name", type: "text", required: true },
      { name: "type", type: "text" },
      { name: "rental_or_purchase", type: "text" },
      { name: "quantity", type: "number" },
      { name: "cost_per_period", type: "number" },
      { name: "period_unit", type: "text" },
      { name: "usage_duration", type: "number" },
      { name: "maintenance_cost", type: "number" },
      { name: "fuel_cost", type: "number" },
      { name: "total_cost", type: "number" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "additional_costs",
    fields: [
      ...childBase(true),
      { name: "category", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "amount", type: "number" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "risks",
    fields: [
      ...childBase(false),
      { name: "description", type: "text", required: true },
      { name: "probability", type: "text" },
      { name: "impact_amount", type: "number" },
      { name: "mitigation_plan", type: "text" },
      { name: "contingency_amount", type: "number" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "comments",
    fields: [
      ...childBase(false),
      { name: "content", type: "text", required: true },
    ],
  }));

  // --- versions / shares / external links -----------------------------------
  app.save(new Collection({
    type: "base",
    name: "project_versions",
    // snapshot writes happen via JSVM routes; delete allowed for owner/admin
    createRule: null,
    updateRule: null,
    deleteRule: 'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"',
    fields: [
      { name: "project_id", type: "relation", collectionId: projects.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "name", type: "text", required: true },
      { name: "data", type: "json" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "project_shares",
    // owner manages; email->user resolution happens in a JSVM route
    listRule: 'project_id.user_id = @request.auth.id || shared_with_user_id = @request.auth.id',
    viewRule: 'project_id.user_id = @request.auth.id || shared_with_user_id = @request.auth.id',
    createRule: 'project_id.user_id = @request.auth.id',
    updateRule: 'project_id.user_id = @request.auth.id',
    deleteRule: 'project_id.user_id = @request.auth.id || shared_with_user_id = @request.auth.id',
    fields: [
      { name: "project_id", type: "relation", collectionId: projects.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "shared_with_user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "shared_with_email", type: "text" },
      { name: "role", type: "select", values: ["viewer", "editor"], maxSelect: 1, required: true },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "shared_project_links",
    // tokens stored sha256-hashed; create/verify via JSVM routes only
    listRule: 'project_id.user_id = @request.auth.id',
    viewRule: 'project_id.user_id = @request.auth.id',
    createRule: null,
    updateRule: null,
    deleteRule: 'project_id.user_id = @request.auth.id',
    indexes: ["CREATE UNIQUE INDEX idx_shared_project_links_token ON shared_project_links (token_hash)"],
    fields: [
      { name: "project_id", type: "relation", collectionId: projects.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "created_by_user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "token_hash", type: "text", required: true },
      { name: "password_hash", type: "text" },
      { name: "expires_at", type: "date" },
    ],
  }));

  // --- cost databases --------------------------------------------------------
  const costDatabases = new Collection({
    type: "base",
    name: "cost_databases",
    listRule: 'user_id = @request.auth.id || is_public = true || @request.auth.role = "super_admin"',
    viewRule: 'user_id = @request.auth.id || is_public = true || @request.auth.role = "super_admin"',
    createRule: '@request.auth.id != "" && @request.body.user_id = @request.auth.id',
    updateRule: 'user_id = @request.auth.id || (@request.auth.role = "super_admin" && is_public = true)',
    deleteRule: 'user_id = @request.auth.id || (@request.auth.role = "super_admin" && is_public = true)',
    fields: [
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "is_public", type: "bool" },
      { name: "currency", type: "text" },
    ],
  });
  app.save(costDatabases);

  const dbItemsRule = 'database_id.user_id = @request.auth.id || database_id.is_public = true';
  const dbItemsWrite = 'database_id.user_id = @request.auth.id || (@request.auth.role = "super_admin" && database_id.is_public = true)';
  app.save(new Collection({
    type: "base",
    name: "cost_database_items",
    listRule: dbItemsRule,
    viewRule: dbItemsRule,
    // unique (database_id, csi_code) is enforced by the JSVM CSV upsert route
    createRule: dbItemsWrite,
    updateRule: dbItemsWrite,
    deleteRule: dbItemsWrite,
    indexes: ["CREATE INDEX idx_cdi_db_csi ON cost_database_items (database_id, csi_code)"],
    fields: [
      { name: "database_id", type: "relation", collectionId: costDatabases.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "csi_division", type: "text" },
      { name: "csi_code", type: "text" },
      { name: "description", type: "text" },
      { name: "unit", type: "text" },
      { name: "unit_price", type: "number" },
    ],
  }));

  // --- location adjustments --------------------------------------------------
  app.save(new Collection({
    type: "base",
    name: "location_adjustments",
    listRule: 'database_id.user_id = @request.auth.id || database_id.is_public = true',
    viewRule: 'database_id.user_id = @request.auth.id || database_id.is_public = true',
    createRule: 'database_id.user_id = @request.auth.id',
    updateRule: 'database_id.user_id = @request.auth.id',
    deleteRule: 'database_id.user_id = @request.auth.id',
    fields: [
      { name: "database_id", type: "relation", collectionId: costDatabases.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "city", type: "text", required: true },
      { name: "multiplier", type: "number" },
    ],
  }));

  // --- assemblies ------------------------------------------------------------
  const costAssemblies = new Collection({
    type: "base",
    name: "cost_assemblies",
    listRule: 'user_id = @request.auth.id',
    viewRule: 'user_id = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.user_id = @request.auth.id',
    updateRule: 'user_id = @request.auth.id',
    deleteRule: 'user_id = @request.auth.id',
    fields: [
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "category", type: "text" },
    ],
  });
  app.save(costAssemblies);

  app.save(new Collection({
    type: "base",
    name: "cost_assembly_items",
    listRule: 'assembly_id.user_id = @request.auth.id',
    viewRule: 'assembly_id.user_id = @request.auth.id',
    createRule: 'assembly_id.user_id = @request.auth.id',
    updateRule: 'assembly_id.user_id = @request.auth.id',
    deleteRule: 'assembly_id.user_id = @request.auth.id',
    fields: [
      { name: "assembly_id", type: "relation", collectionId: costAssemblies.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "item_type", type: "select", values: ["material", "labor", "equipment", "additional"], maxSelect: 1, required: true },
      { name: "description", type: "text" },
      { name: "quantity", type: "number" },
      { name: "unit", type: "text" },
      { name: "unit_price", type: "number" },
      { name: "details", type: "json" },
    ],
  }));

  // --- user libraries --------------------------------------------------------
  app.save(new Collection({
    type: "base",
    name: "library_materials",
    listRule: 'user_id = @request.auth.id',
    viewRule: 'user_id = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.user_id = @request.auth.id',
    updateRule: 'user_id = @request.auth.id',
    deleteRule: 'user_id = @request.auth.id',
    fields: [
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "unit", type: "text" },
      { name: "unit_price", type: "number" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "library_labor",
    listRule: 'user_id = @request.auth.id',
    viewRule: 'user_id = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.user_id = @request.auth.id',
    updateRule: 'user_id = @request.auth.id',
    deleteRule: 'user_id = @request.auth.id',
    fields: [
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "worker_type", type: "text", required: true },
      { name: "daily_rate", type: "number" },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "library_equipment",
    listRule: 'user_id = @request.auth.id',
    viewRule: 'user_id = @request.auth.id',
    createRule: '@request.auth.id != "" && @request.body.user_id = @request.auth.id',
    updateRule: 'user_id = @request.auth.id',
    deleteRule: 'user_id = @request.auth.id',
    fields: [
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "name", type: "text", required: true },
      { name: "type", type: "text" },
      { name: "rental_or_purchase", type: "text" },
      { name: "cost_per_period", type: "number" },
      { name: "period_unit", type: "text" },
    ],
  }));

  // --- risk scenarios --------------------------------------------------------
  app.save(new Collection({
    type: "base",
    name: "risk_scenarios",
    listRule: 'user_id = @request.auth.id || is_public = true',
    viewRule: 'user_id = @request.auth.id || is_public = true',
    createRule: '@request.auth.id != "" && @request.body.user_id = @request.auth.id',
    updateRule: 'user_id = @request.auth.id',
    deleteRule: 'user_id = @request.auth.id',
    fields: [
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: true, maxSelect: 1, required: true },
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "impact_rules", type: "json" },
      { name: "is_public", type: "bool" },
    ],
  }));

  // --- settings --------------------------------------------------------------
  app.save(new Collection({
    type: "base",
    name: "dropdown_settings",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "super_admin"',
    updateRule: '@request.auth.role = "super_admin"',
    deleteRule: '@request.auth.role = "super_admin"',
    fields: [
      { name: "category", type: "text", required: true },
      { name: "value", type: "text", required: true },
      { name: "translations", type: "json" },
      { name: "numeric_value", type: "number" },
      { name: "sort_order", type: "number", onlyInt: true },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "currency_rates",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "super_admin"',
    updateRule: '@request.auth.role = "super_admin"',
    deleteRule: '@request.auth.role = "super_admin"',
    fields: [
      { name: "currency_code", type: "text", required: true },
      { name: "rate_to_usd", type: "number", required: true },
    ],
  }));

  app.save(new Collection({
    type: "base",
    name: "app_settings",
    listRule: "key = 'user_signup'",
    viewRule: "key = 'user_signup'",
    createRule: '@request.auth.role = "super_admin"',
    updateRule: '@request.auth.role = "super_admin"',
    deleteRule: '@request.auth.role = "super_admin"',
    fields: [
      { name: "key", type: "text", required: true },
      { name: "value", type: "json" },
    ],
  }));

  // --- audit logs ------------------------------------------------------------
  app.save(new Collection({
    type: "base",
    name: "audit_logs",
    listRule: '@request.auth.role = "super_admin"',
    viewRule: '@request.auth.role = "super_admin"',
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "user_id", type: "relation", collectionId: users.id, cascadeDelete: false, maxSelect: 1 },
      { name: "table_name", type: "text", required: true },
      { name: "action", type: "text", required: true },
      { name: "record_id", type: "text" },
      { name: "old_data", type: "json" },
      { name: "new_data", type: "json" },
    ],
  }));

  // --- final pass: apply share-aware rules to project + child collections ---
  // (project_shares now exists so @collection.project_shares works)
  const shareRead = '(@collection.project_shares.project_id ?= id && @collection.project_shares.shared_with_user_id ?= @request.auth.id)';
  const shareEdit = '(@collection.project_shares.project_id ?= id && @collection.project_shares.shared_with_user_id ?= @request.auth.id && @collection.project_shares.role ?= "editor")';

  const allShareAware = [
    "projects",
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
  ];
  for (const name of allShareAware) {
    const coll = app.findCollectionByNameOrId(name);
    coll.listRule = 'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareRead;
    coll.viewRule = 'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareRead;
    if (name === "projects") {
      coll.createRule = '@request.auth.id != "" && @request.body.user_id = @request.auth.id';
      coll.updateRule = 'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareEdit;
      coll.deleteRule = 'user_id = @request.auth.id || @request.auth.role = "super_admin"';
    } else {
      coll.createRule = 'project_id.user_id = @request.auth.id || ' + shareEdit;
      coll.updateRule = 'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareEdit;
      coll.deleteRule = 'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';
    }
    app.save(coll);
  }
});
