import { describe, it, expect } from "vitest";
import { calculatePublicShareFinancials } from "../publicShareFinancials";
import type {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";

describe("calculatePublicShareFinancials", () => {
  it("calculates totals accurately from items and financial settings", () => {
    const materials: MaterialItem[] = [
      { id: "m1", project_id: "p1", user_id: "u1", name: "Cement", quantity: 10, unit_price: 50, unit: "bag", created_at: "", updated_at: "" },
    ];
    const labor: LaborItem[] = [
      { id: "l1", project_id: "p1", user_id: "u1", worker_type: "Carpenter", number_of_workers: 2, daily_rate: 100, total_days: 5, created_at: "", updated_at: "" },
    ];
    const equipment: EquipmentItem[] = [
      {
        id: "e1",
        project_id: "p1",
        user_id: "u1",
        name: "Excavator",
        rental_or_purchase: "rental",
        quantity: 1,
        cost_per_period: 200,
        usage_duration: 2,
        maintenance_cost: 50,
        fuel_cost: 50,
        period_unit: "day",
        created_at: "",
        updated_at: "",
      },
    ];
    const additional: AdditionalCostItem[] = [
      { id: "a1", project_id: "p1", user_id: "u1", description: "Permit", amount: 300, category: "permits", created_at: "", updated_at: "" },
    ];

    const financialSettings = {
      overhead_percent: 10,
      contingency_percent: 5,
      markup_percent: 15,
      tax_percent: 10,
    };

    // materials: 10 * 50 = 500
    // labor: 2 * 100 * 5 = 1000
    // equipment: (1 * 200 * 2) + 50 + 50 = 500
    // additional: 300
    // direct total = 500 + 1000 + 500 + 300 = 2300
    const summary = calculatePublicShareFinancials(
      financialSettings,
      materials,
      labor,
      equipment,
      additional,
    );

    expect(summary.directCosts).toBe(2300);
    expect(summary.grandTotal).toBeGreaterThan(2300);
  });

  it("does not multiply usage_duration for purchased equipment", () => {
    const equipment: EquipmentItem[] = [
      {
        id: "e2",
        project_id: "p1",
        user_id: "u1",
        name: "Crane",
        rental_or_purchase: "Purchase",
        quantity: 2,
        cost_per_period: 5000,
        usage_duration: 10, // Must NOT be multiplied (2 * 5000 + 100 + 50 = 10150)
        maintenance_cost: 100,
        fuel_cost: 50,
        period_unit: "day",
        created_at: "",
        updated_at: "",
      },
    ];

    const summary = calculatePublicShareFinancials(
      { overhead_percent: 0, contingency_percent: 0, markup_percent: 0, tax_percent: 0 },
      [],
      [],
      equipment,
      [],
    );

    // Purchased equipment total: 2 * 5000 + 100 + 50 = 10150
    expect(summary.equipmentTotal).toBe(10150);
    expect(summary.directCosts).toBe(10150);
  });
});
