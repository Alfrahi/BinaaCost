import { pb } from "@/integrations/pocketbase/client";
import { useOfflinePb } from "@/hooks/useOfflinePb";
import { calculateCategoryTotal } from "@/logic/shared";
import {
  calculateProjectFinancials,
  DEFAULT_FINANCIAL_SETTINGS,
  FinancialSettings,
} from "@/logic/financials";

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
      const [materials, labor, equipment, additional, versions] =
        await Promise.all([
          pb
            .collection("materials")
            .getFullList({ filter: `project_id="${projectId}"` }),
          pb
            .collection("labor_items")
            .getFullList({ filter: `project_id="${projectId}"` }),
          pb
            .collection("equipment_items")
            .getFullList({ filter: `project_id="${projectId}"` }),
          pb
            .collection("additional_costs")
            .getFullList({ filter: `project_id="${projectId}"` }),
          pb.collection("project_versions").getFullList({
            filter: `project_id="${projectId}" && is_final=true`,
            limit: 1,
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
      };
      const financials = calculateProjectFinancials(
        totals,
        (financialSettings as unknown as FinancialSettings) ||
          DEFAULT_FINANCIAL_SETTINGS,
      );

      return {
        grandTotal: financials.grandTotal,
        isFinalized: versions.length > 0,
      };
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  });

  return { summary: data, isLoadingSummary: isLoading };
}