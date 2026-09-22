/// <reference path="../pb_data/types.d.ts" />

// Run every day at 2:00 AM
cronAdd("gc_orphaned_projects", "0 2 * * *", () => {
    console.log("Running GC for orphaned projects...");
    
    // Find users who have been soft-deleted for more than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().replace('T', ' ').substring(0, 19) + 'Z';

    const softDeletedUsers = $app.findRecordsByFilter(
        "users",
        `deleted_at != "" && deleted_at <= {:date}`,
        "-created",
        1000,
        0,
        { "date": dateStr }
    );

    let deletedProjectsCount = 0;

    for (const user of softDeletedUsers) {
        // Find projects belonging to this user
        const projects = $app.findRecordsByFilter(
            "projects",
            `user_id = {:userId}`,
            "",
            100,
            0,
            { "userId": user.id }
        );

        for (const project of projects) {
            try {
                // Hard delete the project (and let its cascade rules run if any, though project deletions are usually handled gracefully)
                $app.delete(project);
                deletedProjectsCount++;
            } catch (err) {
                console.error(`Failed to GC project ${project.id}:`, err);
            }
        }
    }

    console.log(`GC completed: removed ${deletedProjectsCount} orphaned projects.`);
});
