import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { handleError } from "@/shared/lib/toast";
import { calculateRiskContingency } from "@/shared/logic/risk";
import { Risk } from "@/features/projects/project-core/types/project";
import { sanitizeText } from "@/shared/lib/sanitizeText";

interface UseProjectRisksReturn {
  data: Risk[];
  isLoading: boolean;
  error: Error | null;
  addRisk: (values: Omit<Risk, "id" | "created_at" | "updated_at" | "user_id" | "project_id">) => Promise<void>;
  updateRisk: (id: string, values: Omit<Risk, "id" | "created_at" | "updated_at" | "user_id" | "project_id">) => Promise<void>;
  deleteRisk: (id: string) => Promise<void>;
  isAdding: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useProjectRisks(projectId: string): UseProjectRisksReturn {
  const { t } = useTranslation(["project_risk", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation, useQuery } = useOfflinePb();

  const queryKey = ["risks", projectId];

  const { data: risks = [], isLoading, error } = useQuery<Risk[]>({
    queryKey,
    queryFn: async () => mapRecords<Risk>(
      await pb.collection("risks").getFullList({ filter: `project_id="${projectId}"` }),
    ),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  });

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
        description: sanitizeText(values.description),
        probability: sanitizeText(values.probability),
        impact_amount: values.impact_amount,
        mitigation_plan: sanitizeText(values.mitigation_plan),
        contingency_amount: values.contingency_amount,
      });
    },
    [updateRisk, user?.id, t],
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
    data: risks,
    isLoading,
    error,
  };
}