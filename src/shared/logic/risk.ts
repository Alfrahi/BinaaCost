import { safeMult, Decimal } from "@/shared/lib/math";

export const PROBABILITY_WEIGHTS: Record<string, number> = {
  low: 0.1,
  medium: 0.3,
  high: 0.5,
};

export interface RiskProbabilityOption {
  value: string;
  numeric_value?: number | null;
}

export function getProbabilityWeight(probability: string): number {
  const p = probability?.toLowerCase() || "";
  if (p.includes("high")) return PROBABILITY_WEIGHTS.high;
  if (p.includes("medium")) return PROBABILITY_WEIGHTS.medium;
  if (p.includes("low")) return PROBABILITY_WEIGHTS.low;
  return 0;
}

export function resolveProbabilityWeight(
  probability: string | number,
  options?: RiskProbabilityOption[],
): number {
  if (typeof probability === "number") {
    return probability;
  }
  if (!probability) {
    return 0;
  }
  if (options && options.length > 0) {
    const matched = options.find(
      (opt) => opt.value.toLowerCase() === probability.toLowerCase(),
    );
    if (
      matched &&
      typeof matched.numeric_value === "number" &&
      !isNaN(matched.numeric_value)
    ) {
      return matched.numeric_value;
    }
  }
  return getProbabilityWeight(probability);
}

export function calculateRiskContingency(
  impact: number,
  probability: string | number,
  options?: RiskProbabilityOption[],
): number {
  const weight = resolveProbabilityWeight(probability, options);
  return safeMult(impact, new Decimal(weight));
}
