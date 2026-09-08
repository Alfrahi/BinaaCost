import { safeAdd } from "@/utils/math";
import { calculateCategoryTotal } from "./shared";

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