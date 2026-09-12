import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callRoute } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { useOfflinePb } from "@/hooks/useOfflinePb";
import { handleError } from "@/utils/toast";
import { calculateItemCost } from "@/logic/shared";
import { EquipmentItem } from "@/types/project-items";
import { EquipmentFormValues } from "@/types/schemas";
import { useCurrencyConverter } from "./useCurrencyConverter";
import { sanitizeText } from "@/utils/sanitizeText";

export function useProjectEquipment(projectId: string) {
  const { t } = useTranslation(["project_equipment", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflinePb();
  const { convert, getMissingRates } = useCurrencyConverter();

  const queryKey = ["equipment_items", projectId];

  const calculateOptimisticTotalCost = useCallback((item: any) => {
    return calculateItemCost.equipment({
      quantity: item.quantity || 0,
      costPerPeriod: item.cost_per_period || 0,
      usageDuration: item.usage_duration || 0,
      maintenanceCost: item.maintenance_cost,
      fuelCost: item.fuel_cost,
    }).totalCost;
  }, []);

  const optimisticSingleUpdater = useCallback(
    (old: EquipmentItem[] | undefined, variables: any, operation: string) => {
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
    EquipmentItem[]
  >({
    queryKey,
    table: "equipment_items",
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
    EquipmentItem[]
  >({
    queryKey,
    table: "equipment_items",
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
    EquipmentItem[]
  >({
    queryKey,
    table: "equipment_items",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    },
    onError: (err: any) => handleError(err),
  });

  const optimisticBulkUpdater = useCallback(
    (old: EquipmentItem[] | undefined, variables: any, operation: string) => {
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
    useOfflineMutation<string[], EquipmentItem[]>({
      queryKey,
      table: "equipment_items",
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
    useOfflineMutation<{ ids: string[]; data: any }, EquipmentItem[]>({
      queryKey,
      table: "equipment_items",
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

  const syncEquipmentToLibrary = useCallback(
    async (
      equipmentItem: Omit<
        EquipmentItem,
        | "id"
        | "user_id"
        | "created_at"
        | "updated_at"
        | "project_id"
        | "group_id"
        | "total_cost"
        | "quantity"
        | "usage_duration"
        | "maintenance_cost"
        | "fuel_cost"
      > & {
        quantity?: number;
        usage_duration?: number;
        maintenance_cost?: number;
        fuel_cost?: number;
      },
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
        name: sanitizeText(equipmentItem.name),
        type: sanitizeText(equipmentItem.type),
        rental_or_purchase: sanitizeText(equipmentItem.rental_or_purchase),
        cost_per_period: convert(
          equipmentItem.cost_per_period,
          projectCurrency,
          "USD",
        ),
        period_unit: sanitizeText(equipmentItem.period_unit),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      await callRoute("upsert/library_equipment", itemToUpsert);
    },
    [user?.id, t, getMissingRates, convert],
  );

  const handleAddOrUpdateEquipment = useCallback(
    async (
      data: EquipmentFormValues,
      currentCurrency: string,
      editingEquipmentId?: string,
    ) => {
      const payload = {
        name: sanitizeText(data.name),
        type: sanitizeText(data.type),
        rental_or_purchase: sanitizeText(data.rental_or_purchase),
        quantity: data.quantity,
        cost_per_period: data.cost_per_period,
        period_unit: sanitizeText(data.period_unit),
        usage_duration: data.usage_duration,
        maintenance_cost: data.maintenance_cost || 0,
        fuel_cost: data.fuel_cost || 0,
        group_id:
          data.group_id === "ungrouped" || !data.group_id
            ? null
            : data.group_id,
      };

      if (editingEquipmentId) {
        await updateItem({ id: editingEquipmentId, ...payload });
      } else {
        await addItem({
          id: crypto.randomUUID(),
          project_id: projectId,
          user_id: user?.id,
          ...payload,
        });
      }

      await syncEquipmentToLibrary(payload, currentCurrency);
      queryClient.invalidateQueries({ queryKey: ["library_equipment"] });
    },
    [
      addItem,
      updateItem,
      projectId,
      user?.id,
      syncEquipmentToLibrary,
      queryClient,
    ],
  );

  const handleDuplicateEquipment = useCallback(
    (item: EquipmentItem) => {
      const payload: Partial<EquipmentItem> = { ...item };
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

  const handleDeleteEquipment = useCallback(
    async (id: string) => {
      await deleteItem({ id });
    },
    [deleteItem],
  );

  const handleUpdateEquipmentField = useCallback(
    async (id: string, field: Partial<EquipmentItem>) => {
      await updateItem({ id, ...field });
    },
    [updateItem],
  );

  const handleBulkDeleteEquipment = useCallback(
    async (ids: string[]) => {
      await bulkDeleteMutation(ids);
    },
    [bulkDeleteMutation],
  );

  const handleBulkMoveEquipment = useCallback(
    async (ids: string[], groupId: string | null) => {
      await bulkMoveMutation({ ids, data: { group_id: groupId } });
    },
    [bulkMoveMutation],
  );

  return {
    handleAddOrUpdateEquipment,
    handleDuplicateEquipment,
    handleDeleteEquipment,
    handleUpdateEquipmentField,
    handleBulkDeleteEquipment,
    handleBulkMoveEquipment,
    isAddingEquipment: isAdding,
    isUpdatingEquipment: isUpdating,
    isDeletingEquipment: isDeleting,
    isBulkDeletingEquipment: isBulkDeleting,
    isBulkMovingEquipment: isBulkMoving,
  };
}
