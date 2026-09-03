import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { useOfflinePb } from "@/hooks/useOfflinePb";
import { handleError } from "@/utils/toast";
import { AdditionalCostItem } from "@/types/project-items";
import { AdditionalCostFormValues } from "@/types/schemas";
import { sanitizeText } from "@/utils/sanitizeText";

export function useProjectAdditionalCosts(projectId: string) {
  const { t } = useTranslation(["project_additional", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflinePb();

  const queryKey = ["additional_costs", projectId];

  const optimisticSingleUpdater = useCallback(
    (
      old: AdditionalCostItem[] | undefined,
      variables: any,
      operation: string,
    ) => {
      const oldData = old ?? [];
      if (operation === "INSERT") {
        return [
          ...oldData,
          {
            ...variables,
            id: variables.id || crypto.randomUUID(),
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
    [],
  );

  const { mutate: addItem, isPending: isAdding } = useOfflineMutation<
    any,
    AdditionalCostItem[]
  >({
    queryKey,
    table: "additional_costs",
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    },
    onError: (err: any) => handleError(err),
  });

  const { mutate: updateItem, isPending: isUpdating } = useOfflineMutation<
    any,
    AdditionalCostItem[]
  >({
    queryKey,
    table: "additional_costs",
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    },
    onError: (err: any) => handleError(err),
  });

  const { mutate: deleteItem, isPending: isDeleting } = useOfflineMutation<
    any,
    AdditionalCostItem[]
  >({
    queryKey,
    table: "additional_costs",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    },
    onError: (err: any) => handleError(err),
  });

  const optimisticBulkUpdater = useCallback(
    (
      old: AdditionalCostItem[] | undefined,
      variables: any,
      operation: string,
    ) => {
      const oldData = old ?? [];
      if (operation === "BULK_DELETE") {
        const idsToDelete = variables as string[];
        return oldData.filter((item) => !idsToDelete.includes(item.id));
      }
      if (operation === "BULK_UPDATE") {
        const { ids, data } = variables as { ids: string[]; data: any };
        return oldData.map((item) =>
          ids.includes(item.id)
            ? {
                ...item,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : item,
        );
      }
      return oldData;
    },
    [],
  );

  const { mutate: bulkDeleteMutation, isPending: isBulkDeleting } =
    useOfflineMutation<string[], AdditionalCostItem[]>({
      queryKey,
      table: "additional_costs",
      operation: "BULK_DELETE",
      optimisticUpdater: optimisticBulkUpdater,
      onSuccess: () => {
        toast.success(t("common:success"));
        queryClient.invalidateQueries({
          queryKey: ["analytics_projects_data"],
        });
      },
      onError: (err: any) => handleError(err),
    });

  const { mutate: bulkMoveMutation, isPending: isBulkMoving } =
    useOfflineMutation<{ ids: string[]; data: any }, AdditionalCostItem[]>({
      queryKey,
      table: "additional_costs",
      operation: "BULK_UPDATE",
      optimisticUpdater: optimisticBulkUpdater,
      onSuccess: () => {
        toast.success(t("common:success"));
        queryClient.invalidateQueries({
          queryKey: ["analytics_projects_data"],
        });
      },
      onError: (err: any) => handleError(err),
    });

  const handleAddOrUpdateAdditionalCost = useCallback(
    async (
      data: AdditionalCostFormValues,
      editingAdditionalCostId?: string,
    ) => {
      const payload = {
        category: sanitizeText(data.category),
        description: sanitizeText(data.description),
        amount: data.amount,
        group_id:
          data.group_id === "ungrouped" || !data.group_id
            ? null
            : data.group_id,
      };

      if (editingAdditionalCostId) {
        await updateItem({ id: editingAdditionalCostId, ...payload });
      } else {
        await addItem({
          id: crypto.randomUUID(),
          project_id: projectId,
          user_id: user?.id,
          ...payload,
        });
      }
    },
    [addItem, updateItem, projectId, user?.id],
  );

  const handleDuplicateAdditionalCost = useCallback(
    (item: AdditionalCostItem) => {
      const payload: Partial<AdditionalCostItem> = { ...item };
      delete payload.id;
      addItem({
        ...payload,
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: user?.id,
      });
    },
    [addItem, projectId, user?.id],
  );

  const handleDeleteAdditionalCost = useCallback(
    async (id: string) => {
      await deleteItem({ id });
    },
    [deleteItem],
  );

  const handleBulkDeleteAdditionalCosts = useCallback(
    async (ids: string[]) => {
      await bulkDeleteMutation(ids);
    },
    [bulkDeleteMutation],
  );

  const handleBulkMoveAdditionalCosts = useCallback(
    async (ids: string[], groupId: string | null) => {
      await bulkMoveMutation({ ids, data: { group_id: groupId } });
    },
    [bulkMoveMutation],
  );

  return {
    handleAddOrUpdateAdditionalCost,
    handleDuplicateAdditionalCost,
    handleDeleteAdditionalCost,
    handleBulkDeleteAdditionalCosts,
    handleBulkMoveAdditionalCosts,
    isAddingAdditionalCost: isAdding,
    isUpdatingAdditionalCost: isUpdating,
    isDeletingAdditionalCost: isDeleting,
    isBulkDeletingAdditionalCosts: isBulkDeleting,
    isBulkMovingAdditionalCosts: isBulkMoving,
  };
}
