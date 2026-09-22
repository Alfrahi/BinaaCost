import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { FinancialSettings } from "@/shared/logic/financials";
import { handleError } from "@/shared/lib/toast";

export function useUpdateProjectFinancialSettings() {
  const { t } = useTranslation(["common"]);
  const queryClient = useQueryClient();

  const updateFinancialSettingsMutation = useMutation({
    mutationFn: async ({
      projectId,
      newSettings,
      version,
    }: {
      projectId: string;
      newSettings: FinancialSettings;
      version?: number;
    }) => {
      await pb.collection("projects").update(projectId, {
        financial_settings: newSettings,
        financial_settings_confirmed: true,
        version,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projectCardSummary", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["analytics_projects_data"],
      });
    },
    onError: (err: any) => {
      handleError(err);
    },
  });

  return updateFinancialSettingsMutation;
}
