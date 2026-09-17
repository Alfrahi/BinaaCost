import { describe, it, expect } from "vitest";
import { getProbabilityWeight, calculateRiskContingency } from "../risk";
import { calculateCategoryTotal } from "../shared";
import { calculateProjectFinancials } from "../financials";

describe("Risk Logic", () => {
  describe("getProbabilityWeight", () => {
    it("returns correct weights", () => {
      expect(getProbabilityWeight("low")).toBe(0.1);
      expect(getProbabilityWeight("medium")).toBe(0.3);
      expect(getProbabilityWeight("high")).toBe(0.5);
    });

    it("is case insensitive", () => {
      expect(getProbabilityWeight("High")).toBe(0.5);
    });

    it("returns 0 for unknown probability", () => {
      expect(getProbabilityWeight("unknown")).toBe(0);
    });
  });

  describe("calculateRiskContingency", () => {
    it("calculates contingency based on impact and probability", () => {
      expect(calculateRiskContingency(1000, "high")).toBe(500);
      expect(calculateRiskContingency(1000, "medium")).toBe(300);
      expect(calculateRiskContingency(1000, "low")).toBe(100);
    });
  });

  describe("calculateTotalRiskContingency", () => {
    it("sums up contingency amounts", () => {
      const risks = [
        { contingency_amount: 100 },
        { contingency_amount: 200 },
        { contingency_amount: 50 },
      ];
      expect(calculateCategoryTotal.risks(risks as any)).toBe(350);
    });

  });

  describe("combined with general contingency", () => {
    it("both models stay decimal-exact and independent", () => {
      const riskTotal = [
        { impact: 1250.75, probability: "high" },
        { impact: 340.1, probability: "medium" },
        { impact: 99.99, probability: "low" },
      ].map((r) => calculateRiskContingency(r.impact, r.probability));

      // rounding half-up at 2dp is part of the contract
      expect(riskTotal).toEqual([625.38, 102.03, 10]);

      const generalContingency = calculateProjectFinancials(
        {
          materialsTotal: 1000,
          laborTotal: 0,
          equipmentTotal: 0,
          additionalTotal: 0,
        },
        {
          overhead_percent: 0,
          markup_percent: 0,
          tax_percent: 0,
          contingency_percent: 7.5,
        },
      );

      expect(generalContingency.contingencyAmount).toBe(75);
      expect(generalContingency.grandTotal).toBe(1075);
    });
  });
});
