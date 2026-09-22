/// <reference path="../pb_data/types.d.ts" />

// Intercept user deletions to implement soft-deletes
onRecordDeleteRequest((e) => {
    // Soft-delete user instead of hard-delete
    const timestamp = new Date().getTime();
    e.record.set("deleted_at", new Date().toISOString());
    
    // Scramble email to free it up for re-registration
    const oldEmail = e.record.get("email");
    if (oldEmail) {
        e.record.set("email", `deleted_${e.record.id}_${timestamp}@binaacost.local`);
    }
    
    // Scramble username if it exists (often has a unique constraint)
    if (e.record.get("username")) {
        e.record.set("username", `del_${e.record.id}_${timestamp}`);
    }
    
    $app.save(e.record);

    // Stop propagation and return 204 No Content (standard deletion response)
    // If e.noContent doesn't exist, we fallback to returning empty string
    return e.noContent ? e.noContent(204) : e.string(204, "");
}, "users");
