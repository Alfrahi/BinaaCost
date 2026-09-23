import { describe, it, expect } from "vitest";
import {
  getProbabilityWeight,
  resolveProbabilityWeight,
  calculateRiskContingency,
} from "../risk";
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

  describe("resolveProbabilityWeight", () => {
    const customOptions = [
      { value: "very_high", label: "Very High", numeric_value: 0.8 },
      { value: "منخفض", label: "منخفض", numeric_value: 0.15 },
      { value: "medium", label: "Medium" }, // without numeric_value
    ];

    it("uses numeric_value from matching option if available", () => {
      expect(resolveProbabilityWeight("very_high", customOptions)).toBe(0.8);
      expect(resolveProbabilityWeight("منخفض", customOptions)).toBe(0.15);
    });

    it("falls back to standard keyword mapping when option lacks numeric_value", () => {
      expect(resolveProbabilityWeight("medium", customOptions)).toBe(0.3);
    });

    it("falls back to standard keyword mapping when option is not found in options array", () => {
      expect(resolveProbabilityWeight("high", customOptions)).toBe(0.5);
      expect(resolveProbabilityWeight("low", customOptions)).toBe(0.1);
    });

    it("works normally when options array is empty or undefined", () => {
      expect(resolveProbabilityWeight("high")).toBe(0.5);
      expect(resolveProbabilityWeight("high", [])).toBe(0.5);
    });
  });

  describe("calculateRiskContingency", () => {
    it("calculates contingency based on impact and probability", () => {
      expect(calculateRiskContingency(1000, "high")).toBe(500);
      expect(calculateRiskContingency(1000, "medium")).toBe(300);
      expect(calculateRiskContingency(1000, "low")).toBe(100);
    });

    it("calculates contingency using configured option numeric_value", () => {
      const options = [
        { value: "critical", label: "Critical", numeric_value: 0.75 },
        { value: "منخفض", label: "منخفض", numeric_value: 0.15 },
      ];
      expect(calculateRiskContingency(1000, "critical", options)).toBe(750);
      expect(calculateRiskContingency(2000, "منخفض", options)).toBe(300);
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
      expect(riskTotal).toEqual([625, 102, 10]);

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

    it("sums risk contingencies calculated with configured numeric_value via calculateCategoryTotal.risks", () => {
      const configuredOptions = [
        { value: "critical", label: "Critical", numeric_value: 0.8 },
        { value: "minor", label: "Minor", numeric_value: 0.05 },
      ];

      const risk1 = {
        contingency_amount: calculateRiskContingency(10000, "critical", configuredOptions),
      };
      const risk2 = {
        contingency_amount: calculateRiskContingency(4000, "minor", configuredOptions),
      };

      // 10000 * 0.8 = 8000, 4000 * 0.05 = 200
      expect(risk1.contingency_amount).toBe(8000);
      expect(risk2.contingency_amount).toBe(200);

      const totalRisk = calculateCategoryTotal.risks([risk1, risk2]);
      expect(totalRisk).toBe(8200);
    });
  });
});
