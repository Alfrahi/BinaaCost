import { describe, it, expect } from "vitest";
import {
  calculateProjectFinancials,
  hasConfirmedFinancialSettings,
} from "../financials";

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

  it("applies location factor to direct costs (factor 1.2 = +20%)", () => {
    const result = calculateProjectFinancials(
      {
        materialsTotal: 1000,
        laborTotal: 2000,
        equipmentTotal: 500,
        additionalTotal: 500,
      },
      {
        ...mockSettings,
        location_factor: 1.2,
        location_label: "Riyadh",
      },
    );

    // Each category is multiplied, then summed — no double-applied factor
    // Location factor applies to materials+labor+equipment only (not additional)
    // 1200+2400+600+500 = 4700
    expect(result.directCosts).toBe(4700);
    expect(result.locationAdjustmentAmount).toBe(700);
    // Chain uses the adjusted direct costs
    expect(result.overheadAmount).toBe(4700 * 0.1);
    expect(result.grandTotal).toBeGreaterThan(6072);
  });

  it("location factor of 1.0 is a no-op (backwards compatible)", () => {
    const noFactor = calculateProjectFinancials(mockTotals, mockSettings);
    const withFactorOne = calculateProjectFinancials(mockTotals, {
      ...mockSettings,
      location_factor: 1,
    });

    expect(withFactorOne.directCosts).toBe(noFactor.directCosts);
    expect(withFactorOne.locationAdjustmentAmount).toBe(0);
    expect(withFactorOne.grandTotal).toBe(noFactor.grandTotal);
  });

  it("location factor below 1 reduces direct costs", () => {
    const result = calculateProjectFinancials(
      {
        materialsTotal: 1000,
        laborTotal: 2000,
        equipmentTotal: 500,
        additionalTotal: 500,
      },
      {
        ...mockSettings,
        location_factor: 0.9,
      },
    );

    // 1000*0.9 + 2000*0.9 + 500*0.9 + 500 = 3650
    expect(result.directCosts).toBe(3650);
    expect(result.locationAdjustmentAmount).toBe(-350);
  });
});

describe("hasConfirmedFinancialSettings", () => {
  it("is true only when explicitly saved", () => {
    expect(
      hasConfirmedFinancialSettings({ financial_settings_confirmed: true }),
    ).toBe(true);
  });

  it("is false for new/legacy projects (missing, false, or null flag)", () => {
    expect(hasConfirmedFinancialSettings({})).toBe(false);
    expect(
      hasConfirmedFinancialSettings({ financial_settings_confirmed: false }),
    ).toBe(false);
    expect(
      hasConfirmedFinancialSettings({ financial_settings_confirmed: null }),
    ).toBe(false);
  });
});
