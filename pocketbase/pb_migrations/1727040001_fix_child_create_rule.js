/// <reference path="../pb_data/types.d.ts" />
// FIX: Resolve DrySubmit createRule failures for child collections.
//
// Root cause: The back-relation syntax
//   project_id.project_shares_via_project_id.shared_with_user_id
// can cause PocketBase's DrySubmit evaluation to fail when the
// project_shares table has zero matching rows (the common single-owner case).
//
// Fix: Restructure the createRule so that:
// 1. The owner path (project_id.user_id = @request.auth.id) is the
//    primary branch and uses only direct-relation traversal.
// 2. The shared-editor path uses @collection cross-join syntax which
//    is more reliable during DrySubmit evaluation.
// 3. Both branches require @request.body.user_id = @request.auth.id.

migrate((app) => {
  // Share-editor check using @collection cross-join (reliable in DrySubmit)
  const shareEditCrossJoin =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id && ' +
    '@collection.project_shares.role ?= "editor")';

  // Share-read check using @collection cross-join
  const shareReadCrossJoin =
    '(@collection.project_shares.project_id ?= project_id && ' +
    '@collection.project_shares.shared_with_user_id ?= @request.auth.id)';

  // Back-relation syntax (kept for list/view/update/delete where it works reliably)
  const shareEditBackRef =
    '(project_id.project_shares_via_project_id.shared_with_user_id ?= @request.auth.id && ' +
    'project_id.project_shares_via_project_id.role ?= "editor")';
  const shareReadBackRef =
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

    // list/view: back-relation works fine for reads (no DrySubmit)
    coll.listRule =
      '(@request.auth.id != "") && ' +
      '(user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareReadBackRef + ')';
    coll.viewRule = coll.listRule;

    // createRule: Use @collection cross-join for the share check to avoid
    // DrySubmit back-relation evaluation failures.
    // The owner path is the primary check and should short-circuit for
    // single-owner projects (the common case).
    coll.createRule =
      '(@request.auth.id != "") && ' +
      '@request.body.user_id = @request.auth.id && ' +
      '(project_id.user_id = @request.auth.id || ' + shareEditCrossJoin + ')';

    // updateRule: no DrySubmit, back-relation is fine
    coll.updateRule =
      '(@request.auth.id != "") && ' +
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditBackRef + ') && ' +
      '@request.body.user_id:isset = false && @request.body.project_id:isset = false';

    // deleteRule: no DrySubmit, back-relation is fine
    coll.deleteRule =
      '(@request.auth.id != "") && ' +
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditBackRef + ')';

    app.save(coll);
    console.log(`FIX: Updated createRule for ${name} to use @collection cross-join`);
  }
}, (app) => {
  // Rollback: restore previous rules from 1700000033_sec01_fix + 1727020001_fix_anon_rules
  const shareEditBackRef =
    '(project_id.project_shares_via_project_id.shared_with_user_id ?= @request.auth.id && ' +
    'project_id.project_shares_via_project_id.role ?= "editor")';
  const shareReadBackRef =
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

    coll.listRule =
      '(@request.auth.id != "") && ' +
      '(user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareReadBackRef + ')';
    coll.viewRule = coll.listRule;
    coll.createRule =
      '(@request.auth.id != "") && ' +
      '((project_id.user_id = @request.auth.id || ' + shareEditBackRef + ') && ' +
      '@request.body.user_id = @request.auth.id)';
    coll.updateRule =
      '(@request.auth.id != "") && ' +
      '((project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditBackRef + ') && @request.body.user_id:isset = false && @request.body.project_id:isset = false)';
    coll.deleteRule =
      '(@request.auth.id != "") && ' +
      '(project_id.user_id = @request.auth.id || @request.auth.role = "super_admin" || ' +
      shareEditBackRef + ')';
    app.save(coll);
  }
});
