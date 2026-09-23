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

    expect(result.grossMarginPercent).toBeCloseTo(16.67, 2);
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

  it("rounds every chain step to 2dp so the displayed chain reconciles", () => {
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

    // direct = 2036; each step rounded to 2dp so the chain sums by hand
    expect(result.directCosts).toBe(2036);
    expect(result.overheadAmount).toBe(255);
    expect(result.contingencyAmount).toBe(153);
    expect(result.primeCost).toBe(2444);
    expect(result.markupAmount).toBe(367);
    expect(result.bidPrice).toBe(2811);
    expect(result.taxAmount).toBe(232);
    expect(result.grandTotal).toBe(3043);
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

  describe("contingency basis options", () => {
    const costInputsWithRisk = {
      ...mockTotals,
      riskContingency: 350,
    };

    it("defaults to flat percentage when contingency_basis is unspecified", () => {
      const result = calculateProjectFinancials(costInputsWithRisk, mockSettings);

      expect(result.contingencyBasis).toBe("flat");
      expect(result.flatContingencyAmount).toBe(200); // 4000 * 5%
      expect(result.riskContingencyAmount).toBe(350);
      expect(result.contingencyAmount).toBe(200); // Only flat is used in prime cost
      expect(result.primeCost).toBe(4600); // direct (4000) + overhead (400) + flat (200)
    });

    it("uses risk register amount when contingency_basis is risk_register", () => {
      const result = calculateProjectFinancials(costInputsWithRisk, {
        ...mockSettings,
        contingency_basis: "risk_register",
      });

      expect(result.contingencyBasis).toBe("risk_register");
      expect(result.contingencyAmount).toBe(350);
      expect(result.primeCost).toBe(4750); // direct (4000) + overhead (400) + risk (350)
      expect(result.markupAmount).toBe(950); // 4750 * 20%
      expect(result.bidPrice).toBe(5700); // 4750 + 950
      expect(result.taxAmount).toBe(570); // 5700 * 10%
      expect(result.grandTotal).toBe(6270);
    });

    it("combines flat percentage and risk register when contingency_basis is combined", () => {
      const result = calculateProjectFinancials(costInputsWithRisk, {
        ...mockSettings,
        contingency_basis: "combined",
      });

      expect(result.contingencyBasis).toBe("combined");
      expect(result.flatContingencyAmount).toBe(200);
      expect(result.riskContingencyAmount).toBe(350);
      expect(result.contingencyAmount).toBe(550); // 200 + 350
      expect(result.primeCost).toBe(4950); // direct (4000) + overhead (400) + combined (550)
      expect(result.markupAmount).toBe(990); // 4950 * 20%
      expect(result.bidPrice).toBe(5940); // 4950 + 990
      expect(result.taxAmount).toBe(594); // 5940 * 10%
      expect(result.grandTotal).toBe(6534);
    });
  });

  describe("gross margin calculation", () => {
    it("computes true gross margin based on bid price excluding taxes", () => {
      // 100k cost + 20% markup on prime cost -> 120k bid price -> 16.67% gross margin
      const resultNoTax = calculateProjectFinancials(
        { materialsTotal: 100000, laborTotal: 0, equipmentTotal: 0, additionalTotal: 0 },
        { overhead_percent: 0, contingency_percent: 0, markup_percent: 20, tax_percent: 0 },
      );
      expect(resultNoTax.primeCost).toBe(100000);
      expect(resultNoTax.markupAmount).toBe(20000);
      expect(resultNoTax.bidPrice).toBe(120000);
      expect(resultNoTax.grossMarginPercent).toBeCloseTo(16.67, 2);

      // Adding 15% tax increases grandTotal but does NOT alter grossMarginPercent
      const resultWithTax = calculateProjectFinancials(
        { materialsTotal: 100000, laborTotal: 0, equipmentTotal: 0, additionalTotal: 0 },
        { overhead_percent: 0, contingency_percent: 0, markup_percent: 20, tax_percent: 15 },
      );
      expect(resultWithTax.bidPrice).toBe(120000);
      expect(resultWithTax.grandTotal).toBe(138000);
      expect(resultWithTax.grossMarginPercent).toBe(resultNoTax.grossMarginPercent);
    });

    it("returns 0 for zero bid price", () => {
      const result = calculateProjectFinancials(
        { materialsTotal: 0, laborTotal: 0, equipmentTotal: 0, additionalTotal: 0 },
        mockSettings,
      );
      expect(result.grossMarginPercent).toBe(0);
    });
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
