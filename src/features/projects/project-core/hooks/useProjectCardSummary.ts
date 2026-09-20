import { pb } from "@/integrations/pocketbase/client";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { calculateCategoryTotal } from "@/shared/logic/shared";
import {
  calculateProjectFinancials,
  DEFAULT_FINANCIAL_SETTINGS,
  FinancialSettings,
} from "@/shared/logic/financials";
import { STALE_TIME } from "@/shared/lib/queryDefaults";

export interface ProjectCardSummary {
  grandTotal: number;
  isFinalized: boolean;
}

/**
 * Lightweight per-project summary for dashboard cards: grand total (computed
 * from cost items + financial settings, decimal-exact) and whether the project
 * has a finalized version. One query per card, internally parallel.
 */
export function useProjectCardSummary(
  projectId: string,
  financialSettings?: Record<string, number> | null,
) {
  const { useQuery } = useOfflinePb();

  const queryKey = ["projectCardSummary", projectId];

  const { data, isLoading } = useQuery<ProjectCardSummary>({
    queryKey,
    queryFn: async () => {
      const [materials, labor, equipment, additional, versions, risks] =
        await Promise.all([
          pb
            .collection("materials")
            .getFullList({
              filter: `project_id="${projectId}"`,
              fields: "quantity,unit_price",
            }),
          pb
            .collection("labor_items")
            .getFullList({
              filter: `project_id="${projectId}"`,
              fields: "number_of_workers,daily_rate,total_days",
            }),
          pb
            .collection("equipment_items")
            .getFullList({
              filter: `project_id="${projectId}"`,
              fields:
                "rental_or_purchase,quantity,cost_per_period,usage_duration,maintenance_cost,fuel_cost",
            }),
          pb
            .collection("additional_costs")
            .getFullList({
              filter: `project_id="${projectId}"`,
              fields: "amount",
            }),
          pb.collection("project_versions").getList(1, 1, {
            filter: `project_id="${projectId}" && is_final=true`,
            fields: "id",
          }),
          pb
            .collection("risks")
            .getFullList({
              filter: `project_id="${projectId}"`,
              fields: "impact_amount,contingency_amount",
            }),
        ]);

      const totals = {
        materialsTotal: calculateCategoryTotal.materials(
          materials as any[],
        ),
        laborTotal: calculateCategoryTotal.labor(labor as any[]),
        equipmentTotal: calculateCategoryTotal.equipment(
          equipment as any[],
        ),
        additionalTotal: calculateCategoryTotal.additional(
          additional as any[],
        ),
        riskContingency: calculateCategoryTotal.risks(risks as any[]),
      };
      const financials = calculateProjectFinancials(
        totals,
        (financialSettings as unknown as FinancialSettings) ||
          DEFAULT_FINANCIAL_SETTINGS,
      );

      return {
        grandTotal: financials.grandTotal,
        isFinalized: versions.totalItems > 0,
      };
    },
    enabled: !!projectId,
    staleTime: STALE_TIME.ENTITY,
  });

  return { summary: data, isLoadingSummary: isLoading };
}