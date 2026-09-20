import { describe, it, expect } from "vitest";
import { calculateItemCost, calculateCategoryTotal } from "../shared";

describe("Cost Calculations", () => {
  describe("Materials", () => {
    it("calculates item cost", () => {
      expect(calculateItemCost.material(10, 5.5)).toBe(55);
    });

    it("calculates total", () => {
      const items = [
        { quantity: 10, unit_price: 5 },
        { quantity: 2, unit_price: 10 },
      ];
      expect(calculateCategoryTotal.materials(items)).toBe(70);
    });
  });

  describe("Labor", () => {
    it("calculates item cost", () => {
      expect(calculateItemCost.labor(5, 100, 10)).toBe(5000);
    });

    it("calculates total", () => {
      const items = [
        { number_of_workers: 1, daily_rate: 1000, total_days: 1 },
        { number_of_workers: 2, daily_rate: 1000, total_days: 1 },
      ];
      expect(calculateCategoryTotal.labor(items)).toBe(3000);
    });
  });

  describe("Equipment", () => {
    it("calculates item cost (Rental)", () => {
      const input = {
        quantity: 2,
        costPerPeriod: 100,
        usageDuration: 5,
        maintenanceCost: 50,
        fuelCost: 100,
      };
      const result = calculateItemCost.equipment(input);
      expect(result.baseCost).toBe(1000);
      expect(result.totalCost).toBe(1150);
    });

    it("calculates item cost (Purchase - duration is not multiplied)", () => {
      const input = {
        quantity: 2,
        costPerPeriod: 50000,
        usageDuration: 12, // Even if duration is passed, purchase uses single purchase price
        maintenanceCost: 500,
        fuelCost: 200,
        rentalOrPurchase: "Purchase",
      };
      const result = calculateItemCost.equipment(input);
      expect(result.baseCost).toBe(100000); // 2 * 50000
      expect(result.totalCost).toBe(100700); // 100000 + 500 + 200
    });

    it("calculates total with mixed rental and purchase", () => {
      const items = [
        {
          quantity: 2,
          cost_per_period: 100,
          usage_duration: 5,
          maintenance_cost: 0,
          fuel_cost: 0,
          rental_or_purchase: "Rental",
        },
        {
          quantity: 1,
          cost_per_period: 2000,
          usage_duration: 10,
          maintenance_cost: 0,
          fuel_cost: 0,
          rental_or_purchase: "Purchase",
        },
      ];
      // Rental: 2 * 100 * 5 = 1000; Purchase: 1 * 2000 = 2000 => Total = 3000
      expect(calculateCategoryTotal.equipment(items)).toBe(3000);
    });
  });

  describe("Additional Costs", () => {
    it("calculates total", () => {
      const items = [{ amount: 100 }, { amount: 250.5 }];
      expect(calculateCategoryTotal.additional(items)).toBe(350.5);
    });
  });
});
