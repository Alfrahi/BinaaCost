import { describe, it, expect } from "vitest";
import { calculateProjectFinancials } from "../financials";

describe("Financial Logic", () => {
  const mockTotals = {
    materialsTotal: 1000,
    laborTotal: 2000,
    equipmentTotal: 500,
    additionalTotal: 500,
  };

  const mockSettings = {
    overhead_percent: 10,
    contingency_percent: 5,
    markup_percent: 20,
    tax_percent: 10,
  };

  it("calculates financials correctly", () => {
    const result = calculateProjectFinancials(mockTotals, mockSettings);

    expect(result.directCosts).toBe(4000);

    expect(result.overheadAmount).toBe(400);

    expect(result.contingencyAmount).toBe(200);

    expect(result.primeCost).toBe(4600);

    expect(result.markupAmount).toBe(920);

    expect(result.bidPrice).toBe(5520);

    expect(result.taxAmount).toBe(552);

    expect(result.grandTotal).toBe(6072);
  });

  it("handles zero values", () => {
    const zeroTotals = {
      materialsTotal: 0,
      laborTotal: 0,
      equipmentTotal: 0,
      additionalTotal: 0,
    };
    const result = calculateProjectFinancials(zeroTotals, mockSettings);
    expect(result.grandTotal).toBe(0);
  });

  it("keeps the full chain decimal-exact with fractional costs", () => {
    const result = calculateProjectFinancials(
      {
        materialsTotal: 1234.56,
        laborTotal: 789.01,
        equipmentTotal: 0.05,
        additionalTotal: 12.34,
      },
      {
        overhead_percent: 12.5,
        contingency_percent: 7.5,
        markup_percent: 15,
        tax_percent: 8.25,
      },
    );

    // direct = 2035.96; overhead = 254.495; contingency = 152.697
    expect(result.directCosts).toBe(2035.96);
    expect(result.overheadAmount).toBe(254.495);
    expect(result.contingencyAmount).toBe(152.697);
    expect(result.primeCost).toBe(2443.152);
    expect(result.markupAmount).toBe(366.4728);
    expect(result.bidPrice).toBe(2809.6248);
    expect(result.taxAmount).toBe(231.794046);
    expect(result.grandTotal).toBe(3041.418846);
  });
});
