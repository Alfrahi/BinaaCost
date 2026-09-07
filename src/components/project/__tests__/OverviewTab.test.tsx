import { describe, it, expect } from "vitest";
import { countIncompleteItems } from "@/logic/overview";

const base = {
  project: {
    currency: "USD",
    financial_settings_confirmed: true,
  } as any,
  sizeUnits: [],
  projectTypes: [],
  durationUnits: [],
};

describe("countIncompleteItems", () => {
  it("counts items with missing/zero cost data across categories", () => {
    const count = countIncompleteItems({
      ...base,
      materials: [
        { id: "m1", quantity: 2, unit_price: 10 },
        { id: "m2", quantity: 0, unit_price: 10 },
        { id: "m3", quantity: 1, unit_price: 0 },
      ] as any,
      labor: [
        { id: "l1", number_of_workers: 2, daily_rate: 100, total_days: 5 },
        { id: "l2", number_of_workers: 0, daily_rate: 100, total_days: 5 },
      ] as any,
      equipment: [
        { id: "e1", cost_per_period: 100, quantity: 1 },
        { id: "e2", cost_per_period: null, quantity: 1 },
      ] as any,
      additional: [{ id: "a1", amount: 0 }] as any,
    });

    // m2 (qty 0), m3 (price 0), l2 (workers 0), e2 (null cost), a1 (amount 0)
    expect(count).toBe(5);
  });

  it("is zero when all items are complete", () => {
    const count = countIncompleteItems({
      ...base,
      materials: [{ id: "m1", quantity: 2, unit_price: 10 }] as any,
      labor: [
        { id: "l1", number_of_workers: 2, daily_rate: 100, total_days: 5 },
      ] as any,
      equipment: [{ id: "e1", cost_per_period: 100, quantity: 1 }] as any,
      additional: [{ id: "a1", amount: 50 }] as any,
    });
    expect(count).toBe(0);
  });
});
