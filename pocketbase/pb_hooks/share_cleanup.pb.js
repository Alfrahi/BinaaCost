/// <reference path="../pb_data/types.d.ts" />
// M3: revoked editor shares must also revoke the external share links that
// editor created. Owner-created links survive.

onRecordAfterDeleteSuccess((e) => {
  try {
  const projectId = e.record.get("project_id");
  const sharedWith = e.record.get("shared_with_user_id");
  if (!projectId || !sharedWith) {
    e.next();
    return;
  }

  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    project = null;
  }

  const links = $app.findRecordsByFilter(
    "shared_project_links",
    `project_id="${projectId}" && created_by_user_id="${sharedWith}"`,
  );
  for (const link of links) {
    // owner's own links are never revoked (defensive; shared_with_user_id
    // should never be the owner, but don't trust data shape)
    if (project && link.get("created_by_user_id") === project.get("user_id")) {
      continue;
    }
    $app.delete(link);
  }
  } catch (err) {
    $app.logger().error("share cleanup failed", "err", String(err));
  }

  e.next();
}, "project_shares");
