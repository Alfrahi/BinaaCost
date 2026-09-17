import { safeMult, Decimal } from "@/shared/lib/math";

export const PROBABILITY_WEIGHTS: Record<string, number> = {
  low: 0.1,
  medium: 0.3,
  high: 0.5,
};

export function getProbabilityWeight(probability: string): number {
  const p = probability?.toLowerCase() || "";
  if (p.includes("high")) return PROBABILITY_WEIGHTS.high;
  if (p.includes("medium")) return PROBABILITY_WEIGHTS.medium;
  if (p.includes("low")) return PROBABILITY_WEIGHTS.low;
  return 0;
}

export function calculateRiskContingency(
  impact: number,
  probability: string,
): number {
  const weight = getProbabilityWeight(probability);
  return safeMult(impact, new Decimal(weight));
}
