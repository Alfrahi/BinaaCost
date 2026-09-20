import { useMutation, useQueryClient } from "@tanstack/react-query";
import { callRouteWithParams } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/shared/lib/toast";

export function useApplyProjectVersion() {
  const { t } = useTranslation(["project_versions", "common"]);
  const queryClient = useQueryClient();

  const applyProjectVersionMutation = useMutation({
    mutationFn: async (payload: {
      projectId: string;
      versionId: string;
      snapshot?: any;
      createRollback: boolean;
    }) => {
      const { versionId, createRollback } = payload;
      // M6: rollback snapshot is created atomically server-side.
      await callRouteWithParams("versions/apply", { id: versionId }, {
        create_rollback: createRollback,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(t("success_restored"));
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });
      [
        "materials",
        "labor_items",
        "equipment_items",
        "additional_costs",
        "risks",
        "project_groups",
      ].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key, variables.projectId] }),
      );
      queryClient.invalidateQueries({
        queryKey: ["project_versions", variables.projectId],
      });
    },
    onError: (err: any) => {
      handleError(err);
    },
  });

  return {
    applyProjectVersion: applyProjectVersionMutation.mutateAsync,
    isApplyingVersion: applyProjectVersionMutation.isPending,
  };
}
