// PROJECT_VERSIONS RECORD HOOK — prevent updates to finalized versions
routerUpdate("project_versions", (e) => {
  const existing = e.record; // the record before update
  if (existing && existing.get("is_final")) {
    // Finalized versions cannot be updated at all
    throw new ForbiddenError("Finalized versions cannot be modified");
  }
  // Otherwise, allow the update to proceed
  return e.next();
});