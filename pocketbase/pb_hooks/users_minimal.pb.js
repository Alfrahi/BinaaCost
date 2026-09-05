/// <reference path="../pb_data/types.d.ts" />
// POST /api/users/minimal — batch-fetch display identity for collaborators
// (comment authors, share lists) without opening the users directory.
// Returns only safe fields; the users collection rules stay owner-restricted.

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

  const out = [];
  const seen = {};
  for (const id of ids) {
    if (typeof id !== "string" || seen[id]) continue;
    seen[id] = true;
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
