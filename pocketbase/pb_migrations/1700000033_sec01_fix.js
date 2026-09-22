/// <reference path="../pb_data/types.d.ts" />
// SEC-01: Fix independent evaluation of @collection joins
// Replace cross-joins with PocketBase back-relations to ensure conditions apply
// to the same relational row in project_shares.

migrate((app) => {
  // Use relational back-lookups instead of independent @collection queries
  const shareEditChild =
    '(project_id.project_shares_via_project_id.shared_with_user_id ?= @request.auth.id && ' +
    'project_id.project_shares_via_project_id.role ?= "editor")';
  const shareReadChild =
    '(project_id.project_shares_via_project_id.shared_with_user_id ?= @request.auth.id)';

  const children = [
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
  ];

  for (const name of children) {
    const coll = app.findCollectionByNameOrId(name);
    if (!coll) continue;
    
    // list/view rules
    coll.listRule =
      'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareReadChild;
    coll.viewRule = coll.listRule;

    // create rule
    coll.createRule =
      '(project_id.user_id = @request.auth.id || ' + shareEditChild + ') && ' +
      '@request.body.user_id = @request.auth.id';

    // update rule (must preserve project_id / user_id immutability from SEC-P0)
    coll.updateRule =
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild + ') && @request.body.user_id:isset = false && @request.body.project_id:isset = false';

    // delete rule (must allow authorized editors from AUTH-ADV-03)
    coll.deleteRule =
      'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild;
      
    app.save(coll);
    console.log(`SEC-01: updated rules for child collection ${name}`);
  }

  // project_versions (from SEC-P0)
  const versions = app.findCollectionByNameOrId("project_versions");
  if (versions) {
    const ownerOrAdmin = 'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';
    versions.listRule = ownerOrAdmin + ' || ' + shareReadChild;
    versions.viewRule = versions.listRule;
    versions.updateRule =
      `(${ownerOrAdmin}) && is_final != true && @request.body.user_id:isset = false && @request.body.project_id:isset = false && @request.body.is_final:isset = false`;
    app.save(versions);
    console.log("SEC-01: updated rules for project_versions");
  }

  // shared_project_links (from SEC-P0)
  const links = app.findCollectionByNameOrId("shared_project_links");
  if (links) {
    links.listRule =
      `project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || (${shareEditChild} && created_by_user_id = @request.auth.id)`;
    links.viewRule = links.listRule;
    links.deleteRule =
      `project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || (${shareEditChild} && created_by_user_id = @request.auth.id)`;
    app.save(links);
    console.log("SEC-01: updated rules for shared_project_links");
  }

  // projects (from init_schema + editor_permissions)
  const projects = app.findCollectionByNameOrId("projects");
  if (projects) {
    const shareReadProj =
      '(project_shares_via_project_id.shared_with_user_id ?= @request.auth.id)';
    const shareEditProj =
      '(project_shares_via_project_id.shared_with_user_id ?= @request.auth.id && ' +
      'project_shares_via_project_id.role ?= "editor")';

    projects.listRule = 'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareReadProj;
    projects.viewRule = projects.listRule;
    
    projects.updateRule =
      '@request.auth.role = "super_admin" || ' +
      '(user_id = @request.auth.id && @request.body.user_id:isset = false) || ' +
      `(${shareEditProj} && @request.body.user_id:isset = false && @request.body.financial_settings:isset = false && @request.body.financial_settings_confirmed:isset = false)`;
      
    app.save(projects);
    console.log("SEC-01: updated rules for projects");
  }

}, (app) => {
  // Rollback: restore old @collection cross-join rules (from migration 1700000030)
  const shareEditChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';
  const shareReadChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id)';

  const children = [
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
  ];

  for (const name of children) {
    const coll = app.findCollectionByNameOrId(name);
    if (!coll) continue;
    coll.listRule =
      'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareReadChild;
    coll.viewRule = coll.listRule;
    coll.createRule =
      '(project_id.user_id = @request.auth.id || ' + shareEditChild + ') && ' +
      '@request.body.user_id = @request.auth.id';
    coll.updateRule =
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild + ') && @request.body.user_id:isset = false && @request.body.project_id:isset = false';
    coll.deleteRule =
      'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild;
    app.save(coll);
  }

  const versions = app.findCollectionByNameOrId("project_versions");
  if (versions) {
    const ownerOrAdmin = 'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';
    const shareRead =
      '(@collection.project_shares.project_id ?= project_id && ' +
      '@collection.project_shares.shared_with_user_id ?= @request.auth.id)';
    versions.listRule = `${ownerOrAdmin} || ${shareRead}`;
    versions.viewRule = versions.listRule;
    versions.updateRule =
      `(${ownerOrAdmin}) && is_final != true && @request.body.user_id:isset = false && @request.body.project_id:isset = false && @request.body.is_final:isset = false`;
    app.save(versions);
  }

  const links = app.findCollectionByNameOrId("shared_project_links");
  if (links) {
    const shareEdit =
      '(@collection.project_shares.project_id ?= project_id && ' +
      '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
      '@collection.project_shares.role ?= "editor")';
    links.listRule =
      `project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || (${shareEdit} && created_by_user_id = @request.auth.id)`;
    links.viewRule = links.listRule;
    links.deleteRule =
      `project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || (${shareEdit} && created_by_user_id = @request.auth.id)`;
    app.save(links);
  }

  const projects = app.findCollectionByNameOrId("projects");
  if (projects) {
    const shareRead = '(@collection.project_shares.project_id ?= id && @collection.project_shares.shared_with_user_id ?= @request.auth.id)';
    const shareEdit =
      '(@collection.project_shares.project_id ?= id && ' +
      '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
      '@collection.project_shares.role ?= "editor")';
    projects.listRule = 'user_id = @request.auth.id || @request.auth.role = "super_admin" || ' + shareRead;
    projects.viewRule = projects.listRule;
    projects.updateRule =
      '@request.auth.role = "super_admin" || ' +
      '(user_id = @request.auth.id && @request.body.user_id:isset = false) || ' +
      `(${shareEdit} && @request.body.user_id:isset = false && @request.body.financial_settings:isset = false && @request.body.financial_settings_confirmed:isset = false)`;
    app.save(projects);
  }
});
