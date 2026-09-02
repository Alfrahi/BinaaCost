import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callRoute } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { useOfflineSupabase } from "@/hooks/useOfflineSupabase";
import { handleError } from "@/utils/toast";
import { calculateItemCost } from "@/logic/shared";
import { LaborItem } from "@/types/project-items";
import { LaborFormValues } from "@/types/schemas";
import { useCurrencyConverter } from "./useCurrencyConverter";
import { sanitizeText } from "@/utils/sanitizeText";

export function useProjectLabor(projectId: string) {
  const { t } = useTranslation(["project_labor", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflineSupabase();
  const { convert, getMissingRates } = useCurrencyConverter();

  const queryKey = ["labor_items", projectId];

  const calculateOptimisticTotalCost = useCallback((item: any) => {
    return calculateItemCost.labor(
      item.number_of_workers || 0,
      item.daily_rate || 0,
      item.total_days || 0,
    );
  }, []);

  const optimisticSingleUpdater = useCallback(
    (old: LaborItem[] | undefined, variables: any, operation: string) => {
      const oldData = old ?? [];
      if (operation === "INSERT") {
        return [
          ...oldData,
          {
            ...variables,
            id: variables.id || crypto.randomUUID(),
            total_cost: calculateOptimisticTotalCost(variables),
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
                total_cost: calculateOptimisticTotalCost(variables),
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
    [calculateOptimisticTotalCost],
  );

  const { mutate: addItem, isPending: isAdding } = useOfflineMutation<
    any,
    LaborItem[]
  >({
    queryKey,
    table: "labor_items",
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
    LaborItem[]
  >({
    queryKey,
    table: "labor_items",
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
    LaborItem[]
  >({
    queryKey,
    table: "labor_items",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    },
    onError: (err: any) => handleError(err),
  });

  const optimisticBulkUpdater = useCallback(
    (old: LaborItem[] | undefined, variables: any, operation: string) => {
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
    useOfflineMutation<string[], LaborItem[]>({
      queryKey,
      table: "labor_items",
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
    useOfflineMutation<{ ids: string[]; data: any }, LaborItem[]>({
      queryKey,
      table: "labor_items",
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

  const syncLaborToLibrary = useCallback(
    async (
      laborItem: Omit<
        LaborItem,
        | "id"
        | "user_id"
        | "created_at"
        | "updated_at"
        | "project_id"
        | "group_id"
        | "total_cost"
        | "description"
      >,
      projectCurrency: string,
    ) => {
      if (!user?.id) {
        throw new Error(t("common:mustBeLoggedIn"));
      }

      const missing = getMissingRates(projectCurrency, "USD");
      if (missing.length > 0) {
        toast.warning(
          t("common:missingRateWarning", { currency: missing.join(", ") }),
        );
        return;
      }

      const itemToUpsert = {
        worker_type: sanitizeText(laborItem.worker_type),
        daily_rate: convert(laborItem.daily_rate, projectCurrency, "USD"),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      await callRoute("upsert/library_labor", itemToUpsert);
    },
    [user?.id, t, getMissingRates, convert],
  );

  const handleAddOrUpdateLabor = useCallback(
    async (
      data: LaborFormValues,
      currentCurrency: string,
      editingLaborId?: string,
    ) => {
      const payload = {
        worker_type: sanitizeText(data.worker_type),
        number_of_workers: data.number_of_workers,
        daily_rate: data.daily_rate,
        total_days: data.total_days,
        description: sanitizeText(data.description),
        group_id:
          data.group_id === "ungrouped" || !data.group_id
            ? null
            : data.group_id,
      };

      if (editingLaborId) {
        await updateItem({ id: editingLaborId, ...payload });
      } else {
        await addItem({
          id: crypto.randomUUID(),
          project_id: projectId,
          user_id: user?.id,
          ...payload,
        });
      }

      await syncLaborToLibrary(payload, currentCurrency);
      queryClient.invalidateQueries({ queryKey: ["library_labor"] });
    },
    [addItem, updateItem, projectId, user?.id, syncLaborToLibrary, queryClient],
  );

  const handleDuplicateLabor = useCallback(
    (item: LaborItem) => {
      const payload: Partial<LaborItem> = { ...item };
      delete payload.id;
      delete payload.total_cost;
      addItem({
        ...payload,
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: user?.id,
      });
    },
    [addItem, projectId, user?.id],
  );

  const handleDeleteLabor = useCallback(
    async (id: string) => {
      await deleteItem({ id });
    },
    [deleteItem],
  );

  const handleBulkDeleteLabor = useCallback(
    async (ids: string[]) => {
      await bulkDeleteMutation(ids);
    },
    [bulkDeleteMutation],
  );

  const handleBulkMoveLabor = useCallback(
    async (ids: string[], groupId: string | null) => {
      await bulkMoveMutation({ ids, data: { group_id: groupId } });
    },
    [bulkMoveMutation],
  );

  return {
    handleAddOrUpdateLabor,
    handleDuplicateLabor,
    handleDeleteLabor,
    handleBulkDeleteLabor,
    handleBulkMoveLabor,
    isAddingLabor: isAdding,
    isUpdatingLabor: isUpdating,
    isDeletingLabor: isDeleting,
    isBulkDeletingLabor: isBulkDeleting,
    isBulkMovingLabor: isBulkMoving,
  };
}
