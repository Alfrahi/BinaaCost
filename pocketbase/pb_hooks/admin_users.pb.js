/// <reference path="../pb_data/types.d.ts" />
// Admin user management routes. super_admin only; delete blocks self-delete
// and deletion of the last remaining super_admin.

routerAdd("POST", "/api/admin/users/{id}/role", (e) => {
  const auth = e.auth;
  if (!auth || !(auth.get("role") === "super_admin")) {
    throw new ForbiddenError("super_admin only");
  }
  const userId = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const role = body.role;
  if (!role || ["user", "super_admin"].indexOf(role) === -1) {
    throw new BadRequestError("role must be 'user' or 'super_admin'");
  }
  const target = $app.findRecordById("users", userId);

  if (target.get("role") === "super_admin" && role === "user") {
    const admins = $app.findRecordsByFilter("users", `role="super_admin"`);
    if (admins.length <= 1) {
      throw new ForbiddenError("Cannot demote the last super_admin");
    }
  }

  target.set("role", role);
  $app.saveNoValidate(target);
  return e.json(200, { id: userId, role });
});

routerAdd("POST", "/api/admin/users/{id}/subscription", (e) => {
  const auth = e.auth;
  if (!auth || !(auth.get("role") === "super_admin")) {
    throw new ForbiddenError("super_admin only");
  }
  const userId = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const plan = body.plan || "";
  const expiresAt = body.expires_at || null;
  const target = $app.findRecordById("users", userId);
  target.set("subscription_plan", plan);
  target.set("subscription_expires_at", expiresAt);
  $app.saveNoValidate(target);
  return e.json(200, { id: userId, plan });
});

routerAdd("POST", "/api/admin/users/{id}/delete", (e) => {
  const auth = e.auth;
  if (!auth || !(auth.get("role") === "super_admin")) {
    throw new ForbiddenError("super_admin only");
  }
  const userId = e.request.pathValue("id");
  if (userId === auth.id) {
    throw new ForbiddenError("Cannot delete your own account");
  }
  const target = $app.findRecordById("users", userId);
  if (target.get("role") === "super_admin") {
    const admins = $app.findRecordsByFilter("users", `role="super_admin"`);
    if (admins.length <= 1) {
      throw new ForbiddenError("Cannot delete the last super_admin");
    }
  }
  $app.delete(target);
  return e.json(200, { ok: true });
});
