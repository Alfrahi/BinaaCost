/// <reference path="../pb_data/types.d.ts" />
// POST /api/projects/{id}/share-links — create external share link.
// Auth: project owner, editor-share, or super_admin.
// Returns raw token once; stored as sha256(token) w/ PB password field.

routerAdd("POST", "/api/projects/{id}/share-links", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const projectId = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const expiresAt = body.expires_at;
  const password = body.password;

  if (!expiresAt || !password) {
    throw new BadRequestError(
      "Missing required fields: expires_at, password",
    );
  }

  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Project not found");
  }

  const isOwner = project.get("user_id") === auth.id;
  const isSuperAdmin = auth.get("role") === "super_admin";

  let isEditor = false;
  if (!isOwner && !isSuperAdmin) {
    try {
      $app.findFirstRecordByFilter(
        "project_shares",
        `project_id="${projectId}" && shared_with_user_id="${auth.id}" && role="editor"`,
      );
      isEditor = true;
    } catch (_) {
      isEditor = false;
    }
  }

  if (!isOwner && !isEditor && !isSuperAdmin) {
    throw new ForbiddenError(
      "You do not have permission to create share links for this project",
    );
  }

  const token = $security.randomString(48);
  const tokenHash = $security.sha256(token);

  const coll = $app.findCollectionByNameOrId("shared_project_links");
  const rec = new Record(coll);
  rec.set("project_id", projectId);
  rec.set("created_by_user_id", auth.id);
  rec.set("token_hash", tokenHash);
  rec.set("password", password); // password field hashes on save
  rec.set("expires_at", expiresAt);
  $app.save(rec);

  return e.json(200, { access_token: token, id: rec.id });
});
