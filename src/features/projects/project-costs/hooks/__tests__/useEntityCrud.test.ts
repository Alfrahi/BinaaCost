import { describe, it, expect } from "vitest";
import { createOptimisticSingleUpdater } from "../useEntityCrud";
import { calculateItemCost } from "@/shared/logic/shared";

interface TestLaborItem {
  id: string;
  worker_type: string;
  number_of_workers: number;
  daily_rate: number;
  total_days: number;
  total_cost?: number;
  created_at?: string;
  updated_at?: string;
}

describe("createOptimisticSingleUpdater", () => {
  const laborCalculator = (item: any) =>
    calculateItemCost.labor(
      Number(item.number_of_workers) || 0,
      Number(item.daily_rate) || 0,
      Number(item.total_days) || 0,
    );

  const updater = createOptimisticSingleUpdater<TestLaborItem>(laborCalculator);

  const initialItems: TestLaborItem[] = [
    {
      id: "labor-1",
      worker_type: "Carpenter",
      number_of_workers: 2,
      daily_rate: 100,
      total_days: 5,
      total_cost: 1000,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "labor-2",
      worker_type: "Electrician",
      number_of_workers: 1,
      daily_rate: 200,
      total_days: 3,
      total_cost: 600,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
  ];

  it("calculates optimistic total_cost from merged/current state on single field updates", () => {
    // When updating only total_days to 10 (fractional or integer),
    // variables contains only { id: "labor-1", total_days: 10 }.
    // The updater must merge with existing number_of_workers (2) and daily_rate (100)
    // so total_cost becomes 2 * 100 * 10 = 2000, NOT 0 or NaN!
    const updated = updater(
      initialItems,
      { id: "labor-1", total_days: 10 },
      "UPDATE",
    );

    expect(updated).toHaveLength(2);
    const item1 = updated.find((i) => i.id === "labor-1");
    expect(item1).toBeDefined();
    expect(item1?.total_days).toBe(10);
    expect(item1?.number_of_workers).toBe(2);
    expect(item1?.daily_rate).toBe(100);
    expect(item1?.total_cost).toBe(2000);
  });

  it("supports fractional days in optimistic update", () => {
    // 2 workers * $100/day * 2.5 days = $500
    const updated = updater(
      initialItems,
      { id: "labor-1", total_days: 2.5 },
      "UPDATE",
    );

    const item1 = updated.find((i) => i.id === "labor-1");
    expect(item1?.total_days).toBe(2.5);
    expect(item1?.total_cost).toBe(500);
  });

  it("calculates optimistic total_cost on INSERT", () => {
    const newItem = {
      id: "labor-3",
      worker_type: "Mason",
      number_of_workers: 3,
      daily_rate: 150,
      total_days: 4,
    };

    const inserted = updater(initialItems, newItem, "INSERT");

    expect(inserted).toHaveLength(3);
    const item3 = inserted.find((i) => i.id === "labor-3");
    expect(item3).toBeDefined();
    // 3 workers * 150 * 4 = 1800
    expect(item3?.total_cost).toBe(1800);
  });

  it("removes item on DELETE", () => {
    const deleted = updater(initialItems, { id: "labor-1" }, "DELETE");

    expect(deleted).toHaveLength(1);
    expect(deleted[0].id).toBe("labor-2");
  });

  it("returns unchanged array for non-matching update", () => {
    const updated = updater(
      initialItems,
      { id: "non-existent", total_days: 99 },
      "UPDATE",
    );

    expect(updated).toEqual(initialItems);
  });
});
