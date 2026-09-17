import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";

interface IncompleteItemsInput {
  materials?: MaterialItem[];
  labor?: LaborItem[];
  equipment?: EquipmentItem[];
  additional?: AdditionalCostItem[];
}

/** Count of items that need attention (missing/zero cost data). */
export function countIncompleteItems({
  materials = [],
  labor = [],
  equipment = [],
  additional = [],
}: IncompleteItemsInput): number {
  const bad = (n: number | null | undefined) => n == null || n <= 0;

  return (
    materials.filter((m) => bad(m.unit_price) || bad(m.quantity)).length +
    labor.filter(
      (l) => bad(l.daily_rate) || bad(l.number_of_workers) || bad(l.total_days),
    ).length +
    equipment.filter((e) => bad(e.cost_per_period) || bad(e.quantity)).length +
    additional.filter((a) => bad(a.amount)).length
  );
}
