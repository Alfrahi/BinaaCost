migrate((app) => {
  const collection = app.findCollectionByNameOrId("audit_logs");
  const existing = collection.indexes || [];
  const newIndex = "CREATE INDEX `idx_audit_logs_record_id` ON `audit_logs` (`record_id`)";
  if (!existing.some(idx => idx.includes("idx_audit_logs_record_id"))) {
    collection.indexes = [...existing, newIndex];
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("audit_logs");
  const existing = collection.indexes || [];
  if (existing.some(idx => idx.includes("idx_audit_logs_record_id"))) {
    collection.indexes = existing.filter(idx => !idx.includes("idx_audit_logs_record_id"));
    app.save(collection);
  }
});
