// PROJECT_VERSIONS RECORD HOOK — prevent updates to finalized versions
onRecordUpdateRequest((e) => {
  // Check the stored record: a finalized version is immutable regardless of
  // what the request body attempts to set (e.g. is_final: false).
  let stored = null;
  try {
    stored = $app.findRecordById("project_versions", e.record.id);
  } catch (_) {
    stored = null;
  }
  if (stored && stored.get("is_final")) {
    // Finalized versions cannot be updated at all
    throw new ForbiddenError("Finalized versions cannot be modified");
  }
  // Otherwise, allow the update to proceed
  e.next();
}, "project_versions");