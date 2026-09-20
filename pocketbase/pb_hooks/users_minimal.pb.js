/// <reference path="../pb_data/types.d.ts" />
// POST /api/users/minimal — batch-fetch display identity for collaborators
// (comment authors, share lists) without opening the users directory.
// SEC-005: Scoped to the caller's own ID, project collaborators, or super_admin.

routerAdd("POST", "/api/users/minimal", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const body = e.requestInfo().body;
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestError("ids array required");
  }
  if (ids.length > 100) {
    throw new BadRequestError("ids must not exceed 100");
  }

  const isSuperAdmin = auth.get("role") === "super_admin";
  const allowed = {};
  allowed[auth.id] = true;

  if (!isSuperAdmin) {
    const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const safeAuthId = esc(auth.id);

    // 1. Projects caller owns
    const ownedProjects = $app.findRecordsByFilter(
      "projects",
      `user_id = "${safeAuthId}"`,
      "",
      0,
      0,
    );
    const accessibleProjectIds = ownedProjects.map((p) => p.id);

    // 2. Projects shared with caller
    const myShares = $app.findRecordsByFilter(
      "project_shares",
      `shared_with_user_id = "${safeAuthId}"`,
      "",
      0,
      0,
    );
    for (const s of myShares) {
      const pid = s.get("project_id");
      if (pid && !accessibleProjectIds.includes(pid)) {
        accessibleProjectIds.push(pid);
        try {
          const proj = $app.findRecordById("projects", pid);
          if (proj) {
            allowed[proj.get("user_id")] = true;
          }
        } catch (_) {}
      }
    }

    // 3. For all accessible projects, collect collaborators from project_shares and comments
    for (const pid of accessibleProjectIds) {
      const safePid = esc(pid);
      const shares = $app.findRecordsByFilter(
        "project_shares",
        `project_id = "${safePid}"`,
        "",
        0,
        0,
      );
      for (const s of shares) {
        const uid = s.get("shared_with_user_id");
        if (uid) allowed[uid] = true;
      }
      const comments = $app.findRecordsByFilter(
        "comments",
        `project_id = "${safePid}"`,
        "",
        0,
        0,
      );
      for (const c of comments) {
        const uid = c.get("user_id");
        if (uid) allowed[uid] = true;
      }
    }
  }

  const out = [];
  const seen = {};
  for (const id of ids) {
    if (typeof id !== "string" || seen[id]) continue;
    seen[id] = true;
    if (!isSuperAdmin && !allowed[id]) continue;

    let rec = null;
    try {
      rec = $app.findRecordById("users", id);
    } catch (_) {
      rec = null;
    }
    if (!rec) continue;
    out.push({
      id: rec.id,
      email: rec.get("email"),
      first_name: rec.get("first_name"),
      last_name: rec.get("last_name"),
    });
  }

  return e.json(200, out);
});
