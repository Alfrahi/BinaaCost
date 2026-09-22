migrate((app) => {
  const fixRule = (rule) => {
    if (!rule) return rule;
    if (rule.includes("@request.auth.id != \"\"")) return rule; // already patched
    return `(@request.auth.id != "") && (${rule})`;
  };

  const collections = app.findAllCollections();
  for (const coll of collections) {
    if (coll.system) continue; // Skip system collections
    let changed = false;
    if (coll.listRule && coll.listRule.includes("@request.auth.id")) { coll.listRule = fixRule(coll.listRule); changed = true; }
    if (coll.viewRule && coll.viewRule.includes("@request.auth.id")) { coll.viewRule = fixRule(coll.viewRule); changed = true; }
    if (coll.createRule && coll.createRule.includes("@request.auth.id")) { coll.createRule = fixRule(coll.createRule); changed = true; }
    if (coll.updateRule && coll.updateRule.includes("@request.auth.id")) { coll.updateRule = fixRule(coll.updateRule); changed = true; }
    if (coll.deleteRule && coll.deleteRule.includes("@request.auth.id")) { coll.deleteRule = fixRule(coll.deleteRule); changed = true; }
    
    if (changed) {
      app.save(coll);
    }
  }
})
