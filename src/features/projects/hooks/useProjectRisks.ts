import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/app/providers/AuthProvider";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { handleError } from "@/shared/lib/toast";
import { calculateRiskContingency } from "@/shared/logic/risk";
import { Risk } from "@/types/project-items";
import { sanitizeText } from "@/shared/lib/sanitizeText";

export function useProjectRisks(projectId: string) {
  const { t } = useTranslation(["project_risk", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflinePb();

  const queryKey = ["risks", projectId];

  const calculateOptimisticContingency = useCallback(
    (impact: number, probability: string) => {
      return calculateRiskContingency(impact, probability);
    },
    [],
  );

  const optimisticSingleUpdater = useCallback(
    (old: Risk[] | undefined, variables: any, operation: string) => {
      const oldData = old ?? [];
      if (operation === "INSERT") {
        return [
          ...oldData,
          {
            ...variables,
            contingency_amount: calculateOptimisticContingency(
              variables.impact_amount,
              variables.probability,
            ),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
      if (operation === "UPDATE") {
        return oldData.map((item) =>
          item.id === variables.id
            ? {
                ...item,
                ...variables,
                contingency_amount: calculateOptimisticContingency(
                  variables.impact_amount,
                  variables.probability,
                ),
                updated_at: new Date().toISOString(),
              }
            : item,
        );
      }
      if (operation === "DELETE") {
        return oldData.filter((item) => item.id !== variables.id);
      }
      return oldData;
    },
    [calculateOptimisticContingency],
  );

  const addRisk = useOfflineMutation<
    Omit<
      Risk,
      "id" | "created_at" | "updated_at" | "user_id" | "project_id"
    > & { id?: string; user_id?: string; project_id?: string },
    Risk[]
  >({
    queryKey,
    table: "risks",
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (err: any) => handleError(err),
  });

  const updateRisk = useOfflineMutation<Partial<Risk> & { id: string }, Risk[]>(
    {
      queryKey,
      table: "risks",
      operation: "UPDATE",
      optimisticUpdater: optimisticSingleUpdater,
      onSuccess: () => {
        toast.success(t("common:success"));
        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      },
      onError: (err: any) => handleError(err),
    },
  );

  const deleteRisk = useOfflineMutation<{ id: string }, Risk[]>({
    queryKey,
    table: "risks",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (err: any) => handleError(err),
  });

  const handleAddRisk = useCallback(
    async (
      values: Omit<
        Risk,
        "id" | "created_at" | "updated_at" | "user_id" | "project_id"
      >,
    ) => {
      if (!user?.id) {
        toast.error(t("common:mustBeLoggedIn"));
        return;
      }
      await addRisk.mutateAsync({
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: user.id,
        description: sanitizeText(values.description),
        probability: sanitizeText(values.probability),
        impact_amount: values.impact_amount,
        mitigation_plan: sanitizeText(values.mitigation_plan),
        contingency_amount: values.contingency_amount,
      });
    },
    [addRisk, projectId, user?.id, t],
  );

  const handleUpdateRisk = useCallback(
    async (
      id: string,
      values: Omit<
        Risk,
        "id" | "created_at" | "updated_at" | "user_id" | "project_id"
      >,
    ) => {
      if (!user?.id) {
        toast.error(t("common:mustBeLoggedIn"));
        return;
      }
      await updateRisk.mutateAsync({
        id,
        project_id: projectId,
        user_id: user.id,
        description: sanitizeText(values.description),
        probability: sanitizeText(values.probability),
        impact_amount: values.impact_amount,
        mitigation_plan: sanitizeText(values.mitigation_plan),
        contingency_amount: values.contingency_amount,
      });
    },
    [updateRisk, projectId, user?.id, t],
  );

  const handleDeleteRisk = useCallback(
    async (id: string) => {
      await deleteRisk.mutateAsync({ id });
    },
    [deleteRisk],
  );

  return {
    addRisk: handleAddRisk,
    updateRisk: handleUpdateRisk,
    deleteRisk: handleDeleteRisk,
    isAdding: addRisk.isPending,
    isUpdating: updateRisk.isPending,
    isDeleting: deleteRisk.isPending,
  };
}
