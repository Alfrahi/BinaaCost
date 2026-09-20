/// <reference path="../pb_data/types.d.ts" />
// POST /api/users/resolve — resolve email → user id for sharing.
// Only allows lookup by email of a real user; returns nothing sensitive.
// Replaces the Supabase get_user_id_by_email RPC.

routerAdd("POST", "/api/users/resolve", (e) => {
  const auth = e.auth;
  if (!auth || !auth.id) {
    throw new UnauthorizedError("Authentication required");
  }

  const body = e.requestInfo().body;
  const email = (body.email || "").trim().toLowerCase();
  if (!email) {
    throw new BadRequestError("email required");
  }

  let record = null;
  try {
    record = $app.findAuthRecordByEmail("users", email);
  } catch (_) {
    throw new NotFoundError("No user with that email");
  }

  return e.json(200, { id: record.id });
});
