import { pb } from "@/integrations/pocketbase/client";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";

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
      const summaryResult = await pb.send(`/api/projects/${projectId}/summary`, { method: "GET" });

      const financials = calculateProjectFinancials(
        summaryResult.totals,
        (financialSettings as unknown as FinancialSettings) ||
          DEFAULT_FINANCIAL_SETTINGS,
      );

      return {
        grandTotal: financials.grandTotal,
        isFinalized: summaryResult.isFinalized,
      };
    },
    enabled: !!projectId,
    staleTime: STALE_TIME.ENTITY,
  });

  return { summary: data, isLoadingSummary: isLoading };
}