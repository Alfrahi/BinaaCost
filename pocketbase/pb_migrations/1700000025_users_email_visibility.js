/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Ensure all existing user records have emailVisibility = true
  const users = app.findRecordsByFilter("users", "1=1");
  for (const u of users) {
    u.setEmailVisibility(true);
    app.saveNoValidate(u);
  }
  console.log("Backfilled " + users.length + " users with emailVisibility = true");
});
