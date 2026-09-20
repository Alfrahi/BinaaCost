/// <reference path="../pb_data/types.d.ts" />
// SEC-P0: Critical authorization hardening
// 1. Prevent child item theft: ensure project_id cannot be reassigned via updateRule
//    on child collections (project_groups, materials, labor_items, equipment_items,
//    additional_costs, risks, comments).
// 2. Prevent finalized project version mutation: ensure updateRule on project_versions
//    enforces is_final != true, and project_id / user_id / is_final immutability.
// 3. Allow shared collaborators (read) to view project_versions for projects shared with them.
// 4. Allow shared editors who created shared_project_links to view and delete their own links.

migrate((app) => {
  const shareEditChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';

  const children = [
    "project_groups",
    "materials",
    "labor_items",
    "equipment_items",
    "additional_costs",
    "risks",
    "comments",
  ];

  // 1. Enforce project_id immutability on all child collections
  for (const name of children) {
    const coll = app.findCollectionByNameOrId(name);
    if (!coll) continue;
    coll.updateRule =
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild + ') && @request.body.user_id:isset = false && @request.body.project_id:isset = false';
    app.save(coll);
    console.log(`SEC-P0: project_id immutability added to ${name}.updateRule`);
  }

  // 2. Lock finalized project_versions against update & protect project_id / is_final
  const versions = app.findCollectionByNameOrId("project_versions");
  if (versions) {
    const ownerOrAdmin =
      'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';
    const shareRead =
      '(@collection.project_shares.project_id ?= project_id && ' +
      '@collection.project_shares.shared_with_user_id ?= @request.auth.id)';

    versions.listRule = `${ownerOrAdmin} || ${shareRead}`;
    versions.viewRule = versions.listRule;
    versions.updateRule =
      `(${ownerOrAdmin}) && is_final != true && @request.body.user_id:isset = false && @request.body.project_id:isset = false && @request.body.is_final:isset = false`;
    app.save(versions);
    console.log("SEC-P0: updated project_versions rules (finalized locking + shared read)");
  }

  // 3. Allow shared editors to view and manage their own created share links
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
    console.log("SEC-P0: updated shared_project_links rules for editor visibility");
  }
}, (app) => {
  const shareEditChild =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';

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
    coll.updateRule =
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditChild + ') && @request.body.user_id:isset = false';
    app.save(coll);
  }

  const versions = app.findCollectionByNameOrId("project_versions");
  if (versions) {
    const ownerOrAdmin =
      'project_id.user_id = @request.auth.id || @request.auth.role = "super_admin"';
    versions.listRule = ownerOrAdmin;
    versions.viewRule = ownerOrAdmin;
    versions.updateRule = `(${ownerOrAdmin}) && @request.body.user_id:isset = false`;
    app.save(versions);
  }

  const links = app.findCollectionByNameOrId("shared_project_links");
  if (links) {
    links.listRule = 'project_id.user_id = @request.auth.id';
    links.viewRule = 'project_id.user_id = @request.auth.id';
    links.deleteRule = 'project_id.user_id = @request.auth.id';
    app.save(links);
  }
});
