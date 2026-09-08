import { describe, it, expect } from "vitest";
import {
  computeVersionCostSummary,
  computeVersionDelta,
} from "@/logic/versionCosts";

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