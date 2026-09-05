// One-off cleanup: strip the leading apostrophe that the old CSV import
// persisted into cost_database_items text fields (formula-injection defense
// applied at the wrong layer). Idempotent — only touches rows that actually
// start with a single quote.
migrate((app) => {
  const TEXT_FIELDS = ["csi_division", "csi_code", "description", "unit"];
  const rows = app.findRecordsByFilter("cost_database_items", "", "", 0, 0);
  let count = 0;
  for (const row of rows) {
    let changed = false;
    for (const f of TEXT_FIELDS) {
      const v = row.get(f);
      if (typeof v === "string" && v.startsWith("'")) {
        row.set(f, v.slice(1));
        changed = true;
      }
    }
    if (changed) {
      app.save(row);
      count++;
    }
  }
  console.log(`[migration] stripped leading apostrophe from ${count} cost_database_items rows`);
});