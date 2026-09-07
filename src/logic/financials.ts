import { Decimal } from "@/utils/math";

export interface FinancialSettings {
  overhead_percent: number;
  markup_percent: number;
  tax_percent: number;
  contingency_percent: number;
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  overhead_percent: 10,
  markup_percent: 20,
  tax_percent: 0,
  contingency_percent: 5,
};

export function hasConfirmedFinancialSettings(project: {
  financial_settings_confirmed?: boolean | null;
}): boolean {
  return !!project?.financial_settings_confirmed;
}

export interface FinancialSummary {
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
  directCosts: number;
  overheadAmount: number;
  contingencyAmount: number;
  primeCost: number;
  markupAmount: number;
  bidPrice: number;
  taxAmount: number;
  grandTotal: number;
}

interface CostInputs {
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
}

export function calculateProjectFinancials(
  costs: CostInputs,
  settings: FinancialSettings,
): FinancialSummary {
  const materialsTotal = new Decimal(costs.materialsTotal || 0);
  const laborTotal = new Decimal(costs.laborTotal || 0);
  const equipmentTotal = new Decimal(costs.equipmentTotal || 0);
  const additionalTotal = new Decimal(costs.additionalTotal || 0);

  const directCosts = materialsTotal
    .plus(laborTotal)
    .plus(equipmentTotal)
    .plus(additionalTotal);

  const overheadAmount = directCosts
    .times(settings.overhead_percent || 0)
    .dividedBy(100);

  const contingencyAmount = directCosts
    .times(settings.contingency_percent || 0)
    .dividedBy(100);

  const primeCost = directCosts.plus(overheadAmount).plus(contingencyAmount);

  const markupAmount = primeCost
    .times(settings.markup_percent || 0)
    .dividedBy(100);

  const bidPrice = primeCost.plus(markupAmount);

  const taxAmount = bidPrice.times(settings.tax_percent || 0).dividedBy(100);

  const grandTotal = bidPrice.plus(taxAmount);

  return {
    materialsTotal: materialsTotal.toNumber(),
    laborTotal: laborTotal.toNumber(),
    equipmentTotal: equipmentTotal.toNumber(),
    additionalTotal: additionalTotal.toNumber(),
    directCosts: directCosts.toNumber(),
    overheadAmount: overheadAmount.toNumber(),
    contingencyAmount: contingencyAmount.toNumber(),
    primeCost: primeCost.toNumber(),
    markupAmount: markupAmount.toNumber(),
    bidPrice: bidPrice.toNumber(),
    taxAmount: taxAmount.toNumber(),
    grandTotal: grandTotal.toNumber(),
  };
}
