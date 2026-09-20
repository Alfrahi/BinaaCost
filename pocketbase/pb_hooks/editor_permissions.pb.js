/// <reference path="../pb_data/types.d.ts" />
// AUTH-ADV-02: Enforce financial settings authorization in JSVM hook.
// Only project owners and super_admins can modify financial_settings or
// financial_settings_confirmed on a project. Editors and collaborators are blocked.

onRecordUpdateRequest((e) => {
  const auth = e.auth;
  if (!auth) return;
  if (auth.get("role") === "super_admin") {
    e.next();
    return;
  }

  const project = e.record;
  if (project.get("user_id") === auth.id) {
    e.next();
    return;
  }

  const body = e.requestInfo().body || {};
  if (body.financial_settings !== undefined || body.financial_settings_confirmed !== undefined) {
    throw new ApiError(
      403,
      "Only the project owner or a super admin can modify financial settings.",
      {},
    );
  }

  e.next();
}, "projects");
