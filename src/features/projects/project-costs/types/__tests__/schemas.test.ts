import { describe, it, expect } from "vitest";
import { laborSchema, equipmentSchema } from "../schemas";

describe("Cost Item Schemas", () => {
  describe("laborSchema", () => {
    it("accepts valid labor with integer workers and decimal days", () => {
      const valid = {
        worker_type: "Carpenter",
        number_of_workers: 2,
        daily_rate: 150,
        total_days: 0.5,
      };
      const result = laborSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_days).toBe(0.5);
      }
    });

    it("rejects non-integer number_of_workers", () => {
      const invalid = {
        worker_type: "Carpenter",
        number_of_workers: 1.5,
        daily_rate: 150,
        total_days: 1,
      };
      const result = laborSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects total_days less than 0.01", () => {
      const invalid = {
        worker_type: "Carpenter",
        number_of_workers: 1,
        daily_rate: 150,
        total_days: 0,
      };
      const result = laborSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("equipmentSchema", () => {
    it("accepts valid rental equipment with integer quantity and decimal duration", () => {
      const valid = {
        name: "Excavator",
        rental_or_purchase: "Rental",
        quantity: 1,
        cost_per_period: 500,
        period_unit: "Month",
        usage_duration: 1.5,
        maintenance_cost: 50,
        fuel_cost: 100,
      };
      const result = equipmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.usage_duration).toBe(1.5);
      }
    });

    it("rejects non-integer equipment quantity", () => {
      const invalid = {
        name: "Excavator",
        rental_or_purchase: "Rental",
        quantity: 1.5,
        cost_per_period: 500,
        period_unit: "Day",
        usage_duration: 1,
      };
      const result = equipmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects rental usage_duration of 0 or negative", () => {
      const invalid = {
        name: "Excavator",
        rental_or_purchase: "Rental",
        quantity: 1,
        cost_per_period: 500,
        period_unit: "Day",
        usage_duration: 0,
      };
      const result = equipmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
