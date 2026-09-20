import { calculateProjectFinancials, FinancialSummary } from "@/shared/logic/financials";
import { calculateItemCost, calculateCategoryTotal } from "@/shared/logic/shared";
import type {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";
import type { Risk } from "@/features/projects/project-core/types/project";

export function calculatePublicShareFinancials(
  financialSettings: any,
  materials: MaterialItem[],
  labor: LaborItem[],
  equipment: EquipmentItem[],
  additional: AdditionalCostItem[],
  risks?: Risk[],
): FinancialSummary {
  const materialsTotal = materials.reduce(
    (sum: number, item: MaterialItem) =>
      sum + calculateItemCost.material(item.quantity, item.unit_price),
    0,
  );
  const laborTotal = labor.reduce(
    (sum: number, item: LaborItem) =>
      sum +
      calculateItemCost.labor(
        item.number_of_workers,
        item.daily_rate,
        item.total_days,
      ),
    0,
  );
  const equipmentTotal = equipment.reduce(
    (sum: number, item: EquipmentItem) =>
      sum +
      calculateItemCost.equipment({
        quantity: item.quantity,
        costPerPeriod: item.cost_per_period,
        usageDuration: item.usage_duration,
        maintenanceCost: item.maintenance_cost,
        fuelCost: item.fuel_cost,
        rentalOrPurchase: item.rental_or_purchase,
      }).totalCost,
    0,
  );
  const additionalTotal = additional.reduce(
    (sum: number, item: AdditionalCostItem) => sum + item.amount,
    0,
  );
  const riskContingency = risks ? calculateCategoryTotal.risks(risks) : 0;

  return calculateProjectFinancials(
    {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      additionalTotal,
      riskContingency,
    },
    financialSettings,
  );
}
