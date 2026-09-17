import { safeAdd, safeSub } from "@/shared/lib/math";
import { calculateCategoryTotal } from "./shared";
import {
  calculateProjectFinancials,
  DEFAULT_FINANCIAL_SETTINGS,
  FinancialSettings,
  FinancialSummary,
} from "./financials";

export interface VersionCostSummary {
  materials: number;
  labor: number;
  equipment: number;
  additional: number;
  directTotal: number;
}

/**
 * Compute the direct-cost summary for a version snapshot. The snapshot is the
 * `data` JSON stored on a project_versions record: `{ project, materials,
 * labor_items, equipment_items, additional_costs, risks, project_groups }`.
 * Uses the same decimal-exact helpers as the live project totals so a version's
 * cost matches what the project showed at snapshot time.
 */
export function computeVersionCostSummary(
  snapshot: any,
): VersionCostSummary {
  const materials = calculateCategoryTotal.materials(snapshot?.materials || []);
  const labor = calculateCategoryTotal.labor(snapshot?.labor_items || []);
  const equipment = calculateCategoryTotal.equipment(
    snapshot?.equipment_items || [],
  );
  const additional = calculateCategoryTotal.additional(
    snapshot?.additional_costs || [],
  );
  return {
    materials,
    labor,
    equipment,
    additional,
    directTotal: safeAdd(materials, labor, equipment, additional),
  };
}

/**
 * Delta between two version cost summaries (next minus prev). Returns 0 for
 * each category when either side is missing. Used to show "cost summary delta
 * vs previous version" in the timeline.
 */
export function computeVersionDelta(
  prev: VersionCostSummary | null,
  next: VersionCostSummary,
): VersionCostSummary {
  if (!prev) {
    return { ...next };
  }
  return {
    materials: safeAdd(next.materials, -prev.materials),
    labor: safeAdd(next.labor, -prev.labor),
    equipment: safeAdd(next.equipment, -prev.equipment),
    additional: safeAdd(next.additional, -prev.additional),
    directTotal: safeAdd(next.directTotal, -prev.directTotal),
  };
}

/**
 * Financial assumptions stored on a version snapshot. Falls back to the
 * project defaults when the snapshot predates explicit settings.
 */
export function getVersionFinancialSettings(
  snapshot: any,
): FinancialSettings {
  const s = snapshot?.project?.financial_settings;
  return {
    overhead_percent:
      s?.overhead_percent ?? DEFAULT_FINANCIAL_SETTINGS.overhead_percent,
    markup_percent:
      s?.markup_percent ?? DEFAULT_FINANCIAL_SETTINGS.markup_percent,
    tax_percent: s?.tax_percent ?? DEFAULT_FINANCIAL_SETTINGS.tax_percent,
    contingency_percent:
      s?.contingency_percent ?? DEFAULT_FINANCIAL_SETTINGS.contingency_percent,
  };
}

export interface VersionComparisonSide {
  summary: VersionCostSummary;
  settings: FinancialSettings;
  financials: FinancialSummary;
}

export interface VersionComparisonResult {
  a: VersionComparisonSide;
  b: VersionComparisonSide;
  /** Delta = B minus A. Positive means B is higher. */
  deltas: {
    materials: number;
    labor: number;
    equipment: number;
    additional: number;
    directTotal: number;
    grandTotal: number;
  };
}

/**
 * Side-by-side comparison of two version snapshots: cost category totals,
 * financial assumptions, and grand total. Deltas are B minus A, computed with
 * decimal-exact arithmetic so they match the stored snapshots exactly.
 */
export function computeVersionComparison(
  aSnapshot: any,
  bSnapshot: any,
): VersionComparisonResult {
  const aSummary = computeVersionCostSummary(aSnapshot);
  const bSummary = computeVersionCostSummary(bSnapshot);
  const aSettings = getVersionFinancialSettings(aSnapshot);
  const bSettings = getVersionFinancialSettings(bSnapshot);
  const aFinancials = calculateProjectFinancials(
    {
      materialsTotal: aSummary.materials,
      laborTotal: aSummary.labor,
      equipmentTotal: aSummary.equipment,
      additionalTotal: aSummary.additional,
    },
    aSettings,
  );
  const bFinancials = calculateProjectFinancials(
    {
      materialsTotal: bSummary.materials,
      laborTotal: bSummary.labor,
      equipmentTotal: bSummary.equipment,
      additionalTotal: bSummary.additional,
    },
    bSettings,
  );

  return {
    a: { summary: aSummary, settings: aSettings, financials: aFinancials },
    b: { summary: bSummary, settings: bSettings, financials: bFinancials },
    deltas: {
      materials: safeSub(bSummary.materials, aSummary.materials),
      labor: safeSub(bSummary.labor, aSummary.labor),
      equipment: safeSub(bSummary.equipment, aSummary.equipment),
      additional: safeSub(bSummary.additional, aSummary.additional),
      directTotal: safeSub(bSummary.directTotal, aSummary.directTotal),
      grandTotal: safeSub(bFinancials.grandTotal, aFinancials.grandTotal),
    },
  };
}