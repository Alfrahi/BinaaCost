import { describe, it, expect } from "vitest";
import {
  computeVersionCostSummary,
  computeVersionDelta,
  computeVersionComparison,
  getVersionFinancialSettings,
} from "@/shared/logic/versionCosts";

describe("computeVersionCostSummary", () => {
  it("computes direct totals from a version snapshot", () => {
    const snapshot = {
      materials: [
        { quantity: 10, unit_price: 5.5 },
        { quantity: 2, unit_price: 100 },
      ],
      labor_items: [
        { number_of_workers: 3, daily_rate: 50, total_days: 4 },
      ],
      equipment_items: [
        {
          quantity: 1,
          cost_per_period: 150,
          usage_duration: 10,
          maintenance_cost: 20,
          fuel_cost: 5,
        },
      ],
      additional_costs: [{ amount: 300 }],
    };
    const summary = computeVersionCostSummary(snapshot);
    // materials 55 + 200 = 255; labor 600; equipment 1500+20+5=1525; additional 300
    expect(summary.materials).toBe(255);
    expect(summary.labor).toBe(600);
    expect(summary.equipment).toBe(1525);
    expect(summary.additional).toBe(300);
    expect(summary.directTotal).toBe(2680);
  });

  it("handles empty/missing snapshot categories as zero", () => {
    const summary = computeVersionCostSummary({});
    expect(summary).toEqual({
      materials: 0,
      labor: 0,
      equipment: 0,
      additional: 0,
      directTotal: 0,
    });
  });
});

describe("computeVersionDelta", () => {
  it("returns the next summary when there is no previous", () => {
    const next = {
      materials: 100,
      labor: 0,
      equipment: 0,
      additional: 0,
      directTotal: 100,
    };
    expect(computeVersionDelta(null, next)).toEqual(next);
  });

  it("computes next minus prev with decimal-exact values", () => {
    const prev = {
      materials: 100,
      labor: 50,
      equipment: 0,
      additional: 0,
      directTotal: 150,
    };
    const next = {
      materials: 150,
      labor: 50,
      equipment: 25,
      additional: 0,
      directTotal: 225,
    };
    const delta = computeVersionDelta(prev, next);
    expect(delta.materials).toBe(50);
    expect(delta.labor).toBe(0);
    expect(delta.equipment).toBe(25);
    expect(delta.directTotal).toBe(75);
  });

  it("produces negative deltas for cost decreases", () => {
    const prev = {
      materials: 200,
      labor: 0,
      equipment: 0,
      additional: 0,
      directTotal: 200,
    };
    const next = {
      materials: 150,
      labor: 0,
      equipment: 0,
      additional: 0,
      directTotal: 150,
    };
    expect(computeVersionDelta(prev, next).directTotal).toBe(-50);
  });
});

describe("getVersionFinancialSettings", () => {
  it("reads settings from the snapshot project", () => {
    const settings = getVersionFinancialSettings({
      project: {
        financial_settings: {
          overhead_percent: 12,
          markup_percent: 25,
          tax_percent: 5,
          contingency_percent: 8,
        },
      },
    });
    expect(settings).toEqual({
      overhead_percent: 12,
      markup_percent: 25,
      tax_percent: 5,
      contingency_percent: 8,
    });
  });

  it("falls back to defaults when settings are missing", () => {
    const settings = getVersionFinancialSettings({});
    expect(settings).toEqual({
      overhead_percent: 10,
      markup_percent: 20,
      tax_percent: 0,
      contingency_percent: 5,
    });
  });
});

describe("computeVersionComparison", () => {
  const snapshotA = {
    project: {
      financial_settings: {
        overhead_percent: 10,
        markup_percent: 20,
        tax_percent: 0,
        contingency_percent: 5,
      },
    },
    materials: [{ quantity: 10, unit_price: 5 }], // 50
    labor_items: [],
    equipment_items: [],
    additional_costs: [],
  };
  const snapshotB = {
    project: {
      financial_settings: {
        overhead_percent: 10,
        markup_percent: 20,
        tax_percent: 0,
        contingency_percent: 5,
      },
    },
    materials: [{ quantity: 20, unit_price: 5 }], // 100
    labor_items: [],
    equipment_items: [],
    additional_costs: [],
  };

  it("computes category totals, grand totals, and deltas (B minus A)", () => {
    const result = computeVersionComparison(snapshotA, snapshotB);
    expect(result.a.summary.directTotal).toBe(50);
    expect(result.b.summary.directTotal).toBe(100);
    expect(result.deltas.materials).toBe(50);
    expect(result.deltas.directTotal).toBe(50);
    // grand total A: direct 50 → overhead 5, contingency 2.5, prime 57.5,
    // markup 11.5, bid 69, tax 0 → 69. B: direct 100 → 138.
    expect(result.a.financials.grandTotal).toBe(69);
    expect(result.b.financials.grandTotal).toBe(138);
    expect(result.deltas.grandTotal).toBe(69);
  });

  it("produces negative deltas when B is lower", () => {
    const result = computeVersionComparison(snapshotB, snapshotA);
    expect(result.deltas.materials).toBe(-50);
    expect(result.deltas.grandTotal).toBe(-69);
  });

  it("exposes each version's financial assumptions", () => {
    const result = computeVersionComparison(snapshotA, snapshotB);
    expect(result.a.settings.overhead_percent).toBe(10);
    expect(result.b.settings.markup_percent).toBe(20);
  });
});