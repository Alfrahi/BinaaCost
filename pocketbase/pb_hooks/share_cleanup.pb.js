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

// Clean up redundant project_shares and transfer child items when project ownership is transferred.
// An owner does not need an entry in project_shares for their own project.
onRecordAfterUpdateSuccess((e) => {
  try {
    const newUserId = e.record.get("user_id");
    const projectId = e.record.id;
    const original = e.record.original();
    const oldUserId = original ? original.get("user_id") : null;

    if (newUserId && projectId) {
      // 1. Clean up redundant project_shares for the new owner
      const shares = $app.findRecordsByFilter(
        "project_shares",
        `project_id="${projectId}" && shared_with_user_id="${newUserId}"`,
      );
      for (const share of shares) {
        $app.delete(share);
      }

      // 2. If ownership changed, transfer all project child items to new owner
      if (oldUserId && oldUserId !== newUserId) {
        const childCollections = [
          "project_groups",
          "materials",
          "labor_items",
          "equipment_items",
          "additional_costs",
          "risks",
          "project_versions",
          "comments",
        ];

        for (const collName of childCollections) {
          try {
            const records = $app.findRecordsByFilter(
              collName,
              `project_id="${projectId}"`,
            );
            for (const rec of records) {
              if (rec.get("user_id") !== newUserId) {
                rec.set("user_id", newUserId);
                $app.saveNoValidate(rec);
              }
            }
          } catch (err) {
            $app.logger().error("Failed to transfer child items", "collection", collName, "err", String(err));
          }
        }

        // 3. Transfer shared_project_links created by previous owner
        try {
          const links = $app.findRecordsByFilter(
            "shared_project_links",
            `project_id="${projectId}" && created_by_user_id="${oldUserId}"`,
          );
          for (const link of links) {
            link.set("created_by_user_id", newUserId);
            $app.saveNoValidate(link);
          }
        } catch (err) {
          $app.logger().error("Failed to transfer shared_project_links", "err", String(err));
        }

        $app.logger().info("Transferred project and all items to new owner", "projectId", projectId, "from", oldUserId, "to", newUserId);
      }
    }
  } catch (err) {
    $app.logger().error("project ownership transfer cleanup failed", "err", String(err));
  }
  e.next();
}, "projects");


