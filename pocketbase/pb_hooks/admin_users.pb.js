/// <reference path="../pb_data/types.d.ts" />
// Admin user management routes. super_admin only; delete blocks self-delete
// and deletion of the last remaining super_admin.

routerAdd("POST", "/api/admin/users/create", (e) => {
  const auth = e.auth;
  if (!auth || !(auth.get("role") === "super_admin")) {
    throw new ForbiddenError("super_admin only");
  }
  const body = e.requestInfo().body;
  const email = body.email;
  const password = body.password;
  const role = body.role || "user";
  const firstName = body.first_name || "";
  const lastName = body.last_name || "";

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new BadRequestError("Valid email is required");
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters");
  }
  if (["user", "super_admin"].indexOf(role) === -1) {
    throw new BadRequestError("role must be 'user' or 'super_admin'");
  }

  const existing = $app.findRecordsByFilter("users", `email="${email}"`);
  if (existing.length > 0) {
    throw new BadRequestError("Email is already in use");
  }

  const usersColl = $app.findCollectionByNameOrId("users");
  const record = new Record(usersColl);
  record.setEmail(email);
  record.setPassword(password);
  record.set("first_name", firstName);
  record.set("last_name", lastName);
  record.set("role", role);
  record.setEmailVisibility(true);
  $app.save(record);

  return e.json(200, {
    id: record.id,
    email: record.email(),
    first_name: record.get("first_name"),
    last_name: record.get("last_name"),
    role: record.get("role"),
  });
});

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

routerAdd("POST", "/api/admin/users/{id}/update", (e) => {
  const auth = e.auth;
  if (!auth || !(auth.get("role") === "super_admin")) {
    throw new ForbiddenError("super_admin only");
  }
  const userId = e.request.pathValue("id");
  const body = e.requestInfo().body;
  const target = $app.findRecordById("users", userId);

  if (body.first_name !== undefined) {
    target.set("first_name", body.first_name);
  }
  if (body.last_name !== undefined) {
    target.set("last_name", body.last_name);
  }
  if (body.email && body.email !== target.email()) {
    const existing = $app.findRecordsByFilter(
      "users",
      `email="${body.email}" && id != "${userId}"`,
    );
    if (existing.length > 0) {
      throw new BadRequestError("Email is already in use");
    }
    target.setEmail(body.email);
  }
  if (body.role && body.role !== target.get("role")) {
    if (["user", "super_admin"].indexOf(body.role) === -1) {
      throw new BadRequestError("role must be 'user' or 'super_admin'");
    }
    if (target.get("role") === "super_admin" && body.role === "user") {
      const admins = $app.findRecordsByFilter("users", `role="super_admin"`);
      if (admins.length <= 1) {
        throw new ForbiddenError("Cannot demote the last super_admin");
      }
    }
    target.set("role", body.role);
  }
  if (body.password) {
    if (body.password.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters");
    }
    target.setPassword(body.password);
  }

  target.setEmailVisibility(true);
  $app.save(target);
  return e.json(200, {
    id: target.id,
    email: target.email(),
    first_name: target.get("first_name"),
    last_name: target.get("last_name"),
    role: target.get("role"),
  });
});

// Always set emailVisibility = true for created user accounts
onRecordCreate((e) => {
  e.record.setEmailVisibility(true);
  e.next();
}, "users");

// For super_admin requests, ensure email visibility is ignored so admins can always view and manage user emails
onRecordsListRequest((e) => {
  const auth = e.auth;
  if (auth && auth.get("role") === "super_admin") {
    for (const record of e.records) {
      if (record) {
        record.ignoreEmailVisibility(true);
      }
    }
  }
  e.next();
}, "users");

onRecordViewRequest((e) => {
  const auth = e.auth;
  if (auth && auth.get("role") === "super_admin" && e.record) {
    e.record.ignoreEmailVisibility(true);
  }
  e.next();
}, "users");


