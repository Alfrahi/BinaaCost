/// <reference path="../pb_data/types.d.ts" />
// Seed data per plan §6/§7: app_settings, super_admin user, currency_rates, dropdown_settings presets.
// super_admin email/password via env (see .env.example PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD).
migrate((app) => {
  // findFirstRecordByFilter throws "no rows in result set" when absent
  const findFirst = (coll, filter, params) => {
    try {
      return app.findFirstRecordByFilter(coll, filter, params);
    } catch (_) {
      return null;
    }
  };

  // 1. app_settings.user_signup
  const appSettingsColl = app.findCollectionByNameOrId("app_settings");
  if (!findFirst("app_settings", 'key = {:k}', { k: "user_signup" })) {
    const appSettings = new Record(appSettingsColl);
    appSettings.set("key", "user_signup");
    appSettings.set("value", { enabled: true });
    app.save(appSettings);
  }

  // 2. super_admin user (env-driven; skip if no env)
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPass = process.env.PB_ADMIN_PASSWORD;
  if (adminEmail && adminPass) {
    const usersColl = app.findCollectionByNameOrId("users");
    const existing = findFirst("users", 'email = {:email}', { email: adminEmail });
    if (!existing) {
      const u = new Record(usersColl);
      u.set("email", adminEmail);
      u.set("password", adminPass);
      u.set("passwordConfirm", adminPass);
      u.set("role", "super_admin");
      app.save(u);
    } else if (existing.get("role") !== "super_admin") {
      existing.set("role", "super_admin");
      app.save(existing);
    }
  }

  // 3. currency_rates (match Supabase seed exactly)
  const rates = [
    { currency_code: "USD", rate_to_usd: 1.0 },
    { currency_code: "EUR", rate_to_usd: 0.92 },
    { currency_code: "GBP", rate_to_usd: 0.79 },
    { currency_code: "SAR", rate_to_usd: 3.75 },
    { currency_code: "AED", rate_to_usd: 3.67 },
    { currency_code: "CAD", rate_to_usd: 1.36 },
    { currency_code: "AUD", rate_to_usd: 1.52 },
    { currency_code: "INR", rate_to_usd: 83.50 },
    { currency_code: "CNY", rate_to_usd: 7.23 },
    { currency_code: "JPY", rate_to_usd: 155.0 },
    { currency_code: "KRW", rate_to_usd: 156.0 },
    { currency_code: "RUB", rate_to_usd: 91.0 },
    { currency_code: "BRL", rate_to_usd: 5.15 },
    { currency_code: "ZAR", rate_to_usd: 5.10 },
    { currency_code: "TRY", rate_to_usd: 32.2 },
    { currency_code: "EGP", rate_to_usd: 47.5 },
  ];
  const ratesColl = app.findCollectionByNameOrId("currency_rates");
  for (const r of rates) {
    if (!findFirst("currency_rates", 'currency_code = {:c}', { c: r.currency_code })) {
      const rec = new Record(ratesColl);
      rec.set("currency_code", r.currency_code);
      rec.set("rate_to_usd", r.rate_to_usd);
      app.save(rec);
    }
  }

  // 4. dropdown_settings presets (from DropdownSettings.tsx keys + Supabase seeds)
  const dropdowns = [
    // project_type
    { category: "project_type", value: "Residential", translations: { en: "Residential", ar: "سكني" }, numeric_value: 0, sort_order: 1 },
    { category: "project_type", value: "Commercial", translations: { en: "Commercial", ar: "تجاري" }, numeric_value: 0, sort_order: 2 },
    { category: "project_type", value: "Industrial", translations: { en: "Industrial", ar: "صناعي" }, numeric_value: 0, sort_order: 3 },
    { category: "project_type", value: "Infrastructure", translations: { en: "Infrastructure", ar: "بنية تحتية" }, numeric_value: 0, sort_order: 4 },
    { category: "project_type", value: "Renovation", translations: { en: "Renovation", ar: "تجديد" }, numeric_value: 0, sort_order: 5 },

    // project_size_unit
    { category: "project_size_unit", value: "sqft", translations: { en: "sqft", ar: "قدم²" }, numeric_value: 0, sort_order: 1 },
    { category: "project_size_unit", value: "sqm", translations: { en: "sqm", ar: "م²" }, numeric_value: 0, sort_order: 2 },
    { category: "project_size_unit", value: "acre", translations: { en: "acre", ar: "فدان" }, numeric_value: 0, sort_order: 3 },
    { category: "project_size_unit", value: "hectare", translations: { en: "hectare", ar: "هكتار" }, numeric_value: 0, sort_order: 4 },

    // duration_unit (from Supabase seed: Day, Month)
    { category: "duration_unit", value: "Day", translations: { en: "Day", ar: "يوم" }, numeric_value: 0, sort_order: 1 },
    { category: "duration_unit", value: "Month", translations: { en: "Month", ar: "شهر" }, numeric_value: 0, sort_order: 2 },
    { category: "duration_unit", value: "Week", translations: { en: "Week", ar: "أسبوع" }, numeric_value: 0, sort_order: 3 },
    { category: "duration_unit", value: "Year", translations: { en: "Year", ar: "سنة" }, numeric_value: 0, sort_order: 4 },

    // material_unit (common units)
    { category: "material_unit", value: "pcs", translations: { en: "pcs", ar: "قطعة" }, numeric_value: 0, sort_order: 1 },
    { category: "material_unit", value: "m", translations: { en: "m", ar: "متر" }, numeric_value: 0, sort_order: 2 },
    { category: "material_unit", value: "m2", translations: { en: "m²", ar: "م²" }, numeric_value: 0, sort_order: 3 },
    { category: "material_unit", value: "m3", translations: { en: "m³", ar: "م³" }, numeric_value: 0, sort_order: 4 },
    { category: "material_unit", value: "kg", translations: { en: "kg", ar: "كجم" }, numeric_value: 0, sort_order: 5 },
    { category: "material_unit", value: "ton", translations: { en: "ton", ar: "طن" }, numeric_value: 0, sort_order: 6 },
    { category: "material_unit", value: "bag", translations: { en: "bag", ar: "كيس" }, numeric_value: 0, sort_order: 7 },
    { category: "material_unit", value: "roll", translations: { en: "roll", ar: "لفة" }, numeric_value: 0, sort_order: 8 },
    { category: "material_unit", value: "set", translations: { en: "set", ar: "مجموعة" }, numeric_value: 0, sort_order: 9 },
    { category: "material_unit", value: "box", translations: { en: "box", ar: "صندوق" }, numeric_value: 0, sort_order: 10 },

    // equipment_rental_purchase
    { category: "equipment_rental_purchase", value: "Rental", translations: { en: "Rental", ar: "إيجار" }, numeric_value: 0, sort_order: 1 },
    { category: "equipment_rental_purchase", value: "Purchase", translations: { en: "Purchase", ar: "شراء" }, numeric_value: 0, sort_order: 2 },

    // equipment_period_unit
    { category: "equipment_period_unit", value: "hour", translations: { en: "hour", ar: "ساعة" }, numeric_value: 0, sort_order: 1 },
    { category: "equipment_period_unit", value: "day", translations: { en: "day", ar: "يوم" }, numeric_value: 0, sort_order: 2 },
    { category: "equipment_period_unit", value: "week", translations: { en: "week", ar: "أسبوع" }, numeric_value: 0, sort_order: 3 },
    { category: "equipment_period_unit", value: "month", translations: { en: "month", ar: "شهر" }, numeric_value: 0, sort_order: 4 },

    // additional_cost_category
    { category: "additional_cost_category", value: "Permits", translations: { en: "Permits", ar: "تصاريح" }, numeric_value: 0, sort_order: 1 },
    { category: "additional_cost_category", value: "Insurance", translations: { en: "Insurance", ar: "تأمين" }, numeric_value: 0, sort_order: 2 },
    { category: "additional_cost_category", value: "Transport", translations: { en: "Transport", ar: "نقل" }, numeric_value: 0, sort_order: 3 },
    { category: "additional_cost_category", value: "Utilities", translations: { en: "Utilities", ar: "مرافق" }, numeric_value: 0, sort_order: 4 },
    { category: "additional_cost_category", value: "Testing", translations: { en: "Testing", ar: "اختبارات" }, numeric_value: 0, sort_order: 5 },
    { category: "additional_cost_category", value: "Contingency", translations: { en: "Contingency", ar: "احتياطي" }, numeric_value: 0, sort_order: 6 },
    { category: "additional_cost_category", value: "Other", translations: { en: "Other", ar: "أخرى" }, numeric_value: 0, sort_order: 7 },

    // risk_probability (numeric_value matches Supabase seed: Low=0.1, Medium=0.5, High=0.9)
    { category: "risk_probability", value: "Low", translations: { en: "Low", ar: "منخفض" }, numeric_value: 0.1, sort_order: 1 },
    { category: "risk_probability", value: "Medium", translations: { en: "Medium", ar: "متوسط" }, numeric_value: 0.5, sort_order: 2 },
    { category: "risk_probability", value: "High", translations: { en: "High", ar: "عالي" }, numeric_value: 0.9, sort_order: 3 },

    // currency (base set; user can add more)
    { category: "currency", value: "USD", translations: { en: "US Dollar", ar: "دولار أمريكي" }, numeric_value: 0, sort_order: 1 },
    { category: "currency", value: "EUR", translations: { en: "Euro", ar: "يورو" }, numeric_value: 0, sort_order: 2 },
    { category: "currency", value: "GBP", translations: { en: "British Pound", ar: "جنيه إسترليني" }, numeric_value: 0, sort_order: 3 },
    { category: "currency", value: "SAR", translations: { en: "Saudi Riyal", ar: "ريال سعودي" }, numeric_value: 0, sort_order: 4 },
    { category: "currency", value: "AED", translations: { en: "UAE Dirham", ar: "درهم إماراتي" }, numeric_value: 0, sort_order: 5 },
    { category: "currency", value: "CAD", translations: { en: "Canadian Dollar", ar: "دولار كندي" }, numeric_value: 0, sort_order: 6 },
    { category: "currency", value: "AUD", translations: { en: "Australian Dollar", ar: "دولار أسترالي" }, numeric_value: 0, sort_order: 7 },
    { category: "currency", value: "INR", translations: { en: "Indian Rupee", ar: "روبية هندية" }, numeric_value: 0, sort_order: 8 },
    { category: "currency", value: "CNY", translations: { en: "Chinese Yuan", ar: "人民币" }, numeric_value: 0, sort_order: 9 },
  ];
  const ddColl = app.findCollectionByNameOrId("dropdown_settings");
  for (const d of dropdowns) {
    if (!findFirst("dropdown_settings", 'category = {:c} && value = {:v}', { c: d.category, v: d.value })) {
      const rec = new Record(ddColl);
      rec.set("category", d.category);
      rec.set("value", d.value);
      rec.set("translations", d.translations);
      rec.set("numeric_value", d.numeric_value);
      rec.set("sort_order", d.sort_order);
      app.save(rec);
    }
  }
}, (app) => {
  // down: no-op (seed is idempotent / safe to leave)
});