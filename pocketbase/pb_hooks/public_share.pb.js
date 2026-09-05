/// <reference path="../pb_data/types.d.ts" />
// POST /api/share/{token} — public endpoint serving a shared project payload.
// Body: { password: string }
// Token is matched via sha256 hash; password attempts rate-limited per token
// through $app.store() (survives JSVM handler scoping).

routerAdd("POST", "/api/share/{token}", (e) => {
  const token = e.request.pathValue("token");
  const body = e.requestInfo().body;
  const password = body.password || "";

  const tokenHash = $security.sha256(token);

  // --- basic rate limiting: 20 FAILED password attempts / 10min per token ---
  const storeKey = "share_rl_" + tokenHash.slice(0, 24);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const attempts = $app
    .store()
    .get(storeKey);
  const state = attempts && typeof attempts === "object"
    ? attempts
    : { reset: 0, count: 0 };
  if (now > state.reset) {
    state.reset = now + windowMs;
    state.count = 0;
  }
  if (state.count >= 20) {
    throw new TooManyRequestsError("Too many attempts, try again later");
  }

  let link = null;
  try {
    link = $app.findFirstRecordByFilter(
      "shared_project_links",
      `token_hash="${tokenHash}"`,
    );
  } catch (_) {
    throw new NotFoundError("Invalid access token or link not found");
  }

  const expiresAt = link.get("expires_at");
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    throw new ForbiddenError("Share link has expired");
  }

  const projectId = link.get("project_id");

  let project = null;
  try {
    project = $app.findRecordById("projects", projectId);
  } catch (_) {
    throw new NotFoundError("Invalid access token or link not found");
  }
  const deletedAt = project.getString("deleted_at");
  if (deletedAt && deletedAt !== "") {
    throw new NotFoundError("Invalid access token or link not found");
  }

  if (!link.validatePassword(password)) {
    state.count += 1;
    $app.store().set(storeKey, state);
    throw new ForbiddenError("Incorrect password");
  }

  const listChildren = (collectionName) => {
    try {
      return $app
        .findRecordsByFilter(collectionName, `project_id="${projectId}"`, "", 0, 0)
        .map((r) => r.publicExport());
    } catch (_) {
      return [];
    }
  };

  return e.json(200, {
    project: project.publicExport(),
    materials: listChildren("materials"),
    labor: listChildren("labor_items"),
    equipment: listChildren("equipment_items"),
    additional: listChildren("additional_costs"),
    risks: listChildren("risks"),
    groups: listChildren("project_groups"),
    expires_at: expiresAt || null,
    success: true,
  });
});
