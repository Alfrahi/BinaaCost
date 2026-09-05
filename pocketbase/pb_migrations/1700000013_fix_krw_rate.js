migrate((app) => {
  const rates = app.findRecordsByFilter("currency_rates", 'currency_code="KRW"', "", 0, 0);
  for (const r of rates) {
    if (r.get("rate_to_usd") === 156.0) {
      r.set("rate_to_usd", 1350.0);
      app.save(r);
    }
  }
}, (app) => {
  const rates = app.findRecordsByFilter("currency_rates", 'currency_code="KRW"', "", 0, 0);
  for (const r of rates) {
    if (r.get("rate_to_usd") === 1350.0) {
      r.set("rate_to_usd", 156.0);
      app.save(r);
    }
  }
});
