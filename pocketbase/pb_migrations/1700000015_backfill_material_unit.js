/// <reference path="../pb_data/types.d.ts" />
// Backfill the material_unit dropdown_settings that are missing from DBs whose
// 1700000001_seed migration ran before the material_unit entries were added to
// the seed. Idempotent: skips values that already exist.
migrate((app) => {
  const units = [
    { value: "pcs", translations: { en: "pcs", ar: "قطعة" }, sort_order: 1 },
    { value: "m", translations: { en: "m", ar: "متر" }, sort_order: 2 },
    { value: "m2", translations: { en: "m²", ar: "م²" }, sort_order: 3 },
    { value: "m3", translations: { en: "m³", ar: "م³" }, sort_order: 4 },
    { value: "kg", translations: { en: "kg", ar: "كجم" }, sort_order: 5 },
    { value: "ton", translations: { en: "ton", ar: "طن" }, sort_order: 6 },
    { value: "bag", translations: { en: "bag", ar: "كيس" }, sort_order: 7 },
    { value: "roll", translations: { en: "roll", ar: "لفة" }, sort_order: 8 },
    { value: "set", translations: { en: "set", ar: "مجموعة" }, sort_order: 9 },
    { value: "box", translations: { en: "box", ar: "صندوق" }, sort_order: 10 },
  ];
  const coll = app.findCollectionByNameOrId("dropdown_settings");
  for (const u of units) {
    let exists = false;
    try {
      app.findFirstRecordByFilter(
        "dropdown_settings",
        `category="material_unit" && value="${u.value}"`,
      );
      exists = true;
    } catch (_) {
      exists = false;
    }
    if (!exists) {
      const rec = new Record(coll);
      rec.set("category", "material_unit");
      rec.set("value", u.value);
      rec.set("translations", u.translations);
      rec.set("numeric_value", 0);
      rec.set("sort_order", u.sort_order);
      app.save(rec);
    }
  }
}, (app) => {
  // down: remove the backfilled material_unit options
  for (const v of ["pcs", "m", "m2", "m3", "kg", "ton", "bag", "roll", "set", "box"]) {
    try {
      const rec = app.findFirstRecordByFilter(
        "dropdown_settings",
        `category="material_unit" && value="${v}"`,
      );
      app.delete(rec);
    } catch (_) {}
  }
});