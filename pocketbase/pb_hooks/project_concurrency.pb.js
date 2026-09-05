/// <reference path="../pb_data/types.d.ts" />
// M6: optimistic concurrency for project updates. The client sends the
// record's `updated` timestamp it read; if the stored `updated` differs, the
// write is stale and rejected with 409 so the client can surface a
// "project changed elsewhere" dialog instead of silently overwriting.

onRecordUpdateRequest((e) => {
  const body = e.requestInfo().body || {};
  const supplied = body.updated;
  if (supplied == null || supplied === "") {
    e.next();
    return;
  }

  let stored = null;
  try {
    stored = $app.findRecordById("projects", e.record.id);
  } catch (_) {
    stored = null;
  }
  if (!stored) {
    e.next();
    return;
  }

  const storedUpdated = stored.get("updated");
  if (storedUpdated && storedUpdated !== supplied) {
    throw new ApiError(
      409,
      "Project changed elsewhere; reload before saving",
      {},
    );
  }

  e.next();
}, "projects");