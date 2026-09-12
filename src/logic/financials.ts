import { Decimal } from "@/utils/math";

export interface FinancialSettings {
  overhead_percent: number;
  markup_percent: number;
  tax_percent: number;
  contingency_percent: number;
  /** Optional location cost multiplier (e.g. 1.15 = +15%) applied to direct costs before any percent loadings. */
  location_factor?: number;
  /** Human-readable label for the location factor (e.g. "Riyadh". */
  location_label?: string;
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  overhead_percent: 10,
  markup_percent: 20,
  tax_percent: 0,
  contingency_percent: 5,
  location_factor: 1,
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
  /** Direct costs before any location adjustment. */
  directCostsBase: number;
  /** The amount added or removed by the location factor (positive or negative). */
  locationAdjustmentAmount: number;
  /** Effective direct costs after location adjustment. */
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
  const locationFactor = new Decimal(settings.location_factor ?? 1);

  // Every intermediate is rounded to 2dp so the displayed financial chain
  // (direct + overhead + contingency + markup + tax = grand total) reconciles
  // by hand. Unrounded intermediates caused the displayed steps to not sum.
  const materialsTotal = new Decimal(costs.materialsTotal || 0)
    .times(locationFactor)
    .toDecimalPlaces(2);
  const laborTotal = new Decimal(costs.laborTotal || 0)
    .times(locationFactor)
    .toDecimalPlaces(2);
  const equipmentTotal = new Decimal(costs.equipmentTotal || 0)
    .times(locationFactor)
    .toDecimalPlaces(2);
  const additionalTotal = new Decimal(costs.additionalTotal || 0).toDecimalPlaces(
    2,
  );

  const directCosts = materialsTotal
    .plus(laborTotal)
    .plus(equipmentTotal)
    .plus(additionalTotal)
    .toDecimalPlaces(2);

  // directCosts computed *without* the factor, for display purposes
  const directCostsBase = new Decimal(costs.materialsTotal || 0)
    .plus(costs.laborTotal || 0)
    .plus(costs.equipmentTotal || 0)
    .plus(costs.additionalTotal || 0)
    .toDecimalPlaces(2);

  // The amount added by location adjustment (can be negative for factor < 1)
  const locationAdjustmentAmount = directCosts
    .minus(directCostsBase)
    .toDecimalPlaces(2);

  const overheadAmount = directCosts
    .times(settings.overhead_percent || 0)
    .dividedBy(100)
    .toDecimalPlaces(2);

  const contingencyAmount = directCosts
    .times(settings.contingency_percent || 0)
    .dividedBy(100)
    .toDecimalPlaces(2);

  const primeCost = directCosts
    .plus(overheadAmount)
    .plus(contingencyAmount)
    .toDecimalPlaces(2);

  const markupAmount = primeCost
    .times(settings.markup_percent || 0)
    .dividedBy(100)
    .toDecimalPlaces(2);

  const bidPrice = primeCost.plus(markupAmount).toDecimalPlaces(2);

  const taxAmount = bidPrice
    .times(settings.tax_percent || 0)
    .dividedBy(100)
    .toDecimalPlaces(2);

  const grandTotal = bidPrice.plus(taxAmount).toDecimalPlaces(2);

  return {
    materialsTotal: materialsTotal.toNumber(),
    laborTotal: laborTotal.toNumber(),
    equipmentTotal: equipmentTotal.toNumber(),
    additionalTotal: additionalTotal.toNumber(),
    directCostsBase: directCostsBase.toNumber(),
    locationAdjustmentAmount: locationAdjustmentAmount.toNumber(),
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
