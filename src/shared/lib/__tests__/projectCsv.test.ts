// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  parseAndValidateProjectCsv,
  PROJECT_CSV_CONFIGS,
} from "@/features/projects/project-costs/utils/projectCsv";

function makeCsvFile(content: string): File {
  return new File([content], "items.csv", { type: "text/csv" });
}

describe("parseAndValidateProjectCsv", () => {
  it("parses valid material rows with decimal-exact values", async () => {
    const file = makeCsvFile(
      "name,quantity,unit,unit_price\nConcrete,10,m3,5.5\nSteel,2,kg,100\n",
    );
    const mapping = {
      name: "name",
      quantity: "quantity",
      unit: "unit",
      unit_price: "unit_price",
      description: null,
    };
    const { parsedData, invalidRows } = await parseAndValidateProjectCsv(
      file,
      mapping,
      PROJECT_CSV_CONFIGS.materials,
    );
    expect(invalidRows).toEqual([]);
    expect(parsedData).toHaveLength(2);
    expect(parsedData[0]).toMatchObject({
      name: "Concrete",
      quantity: 10,
      unit: "m3",
      unit_price: 5.5,
    });
    expect(parsedData[1]).toMatchObject({
      name: "Steel",
      quantity: 2,
      unit: "kg",
      unit_price: 100,
    });
  });

  it("flags invalid rows with row-level errors", async () => {
    const file = makeCsvFile(
      "name,quantity,unit,unit_price\n,10,m3,5.5\nSteel,0,kg,100\n",
    );
    const mapping = {
      name: "name",
      quantity: "quantity",
      unit: "unit",
      unit_price: "unit_price",
      description: null,
    };
    const { parsedData, invalidRows } = await parseAndValidateProjectCsv(
      file,
      mapping,
      PROJECT_CSV_CONFIGS.materials,
    );
    expect(parsedData).toHaveLength(0);
    expect(invalidRows).toHaveLength(2);
    // Row numbers are 1-based + header row offset.
    expect(invalidRows[0].row).toBe(2);
    expect(invalidRows[1].row).toBe(3);
  });

  it("applies equipment defaults for omitted optional fields", async () => {
    const file = makeCsvFile(
      "name,quantity,cost_per_period,rental_or_purchase,period_unit,usage_duration\nExcavator,1,150,Rental,Day,10\n",
    );
    const mapping = {
      name: "name",
      quantity: "quantity",
      cost_per_period: "cost_per_period",
      rental_or_purchase: "rental_or_purchase",
      period_unit: "period_unit",
      usage_duration: "usage_duration",
      type: null,
      maintenance_cost: null,
      fuel_cost: null,
    };
    const { parsedData, invalidRows } = await parseAndValidateProjectCsv(
      file,
      mapping,
      PROJECT_CSV_CONFIGS.equipment,
    );
    expect(invalidRows).toEqual([]);
    expect(parsedData[0]).toMatchObject({
      name: "Excavator",
      quantity: 1,
      cost_per_period: 150,
      rental_or_purchase: "Rental",
      period_unit: "Day",
      usage_duration: 10,
      maintenance_cost: 0,
      fuel_cost: 0,
    });
  });
});