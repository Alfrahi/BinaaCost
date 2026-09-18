import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callRoute } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { useEntityCrud, EntityCrud } from "@/shared/hooks/useEntityCrud";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { calculateItemCost } from "@/shared/logic/shared";
import { EquipmentItem } from "@/features/projects/project-costs/types/items";
import { EquipmentFormValues } from "@/features/projects/project-costs/types/schemas";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { sanitizeText } from "@/shared/lib/sanitizeText";

interface UseProjectEquipmentReturn extends EntityCrud<EquipmentItem> {
  data: EquipmentItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjectEquipment(
  projectId: string,
): UseProjectEquipmentReturn {
  const { t } = useTranslation(["project_equipment", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { convert, getMissingRates } = useCurrencyConverter();
  const { useQuery } = useOfflinePb();

  const { data: equipment = [], isLoading, error } = useQuery<EquipmentItem[]>({
    queryKey: ["equipment_items", projectId],
    queryFn: async () => {
      const pb = (await import("@/integrations/pocketbase/client")).pb;
      const records = await pb.collection("equipment_items").getFullList({
        filter: `project_id="${projectId}"`,
      });
      return records.map((r: any) => ({ ...r, id: r.id, created_at: r.created, updated_at: r.updated }));
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  });

  const {
    addItem,
    updateItem,
    deleteItem,
    bulkDeleteMutation,
    bulkMoveMutation,
    isAdding,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    isBulkMoving,
  } = useEntityCrud<EquipmentItem>({
    table: "equipment_items",
    projectId,
    calculateOptimisticTotalCost: (item) =>
      calculateItemCost.equipment({
        quantity: item.quantity || 0,
        costPerPeriod: item.cost_per_period || 0,
        usageDuration: item.usage_duration || 0,
        maintenanceCost: item.maintenance_cost,
        fuelCost: item.fuel_cost,
      }).totalCost,
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

  const handleAddOrUpdate = useCallback(
    async (
      data: EquipmentFormValues,
      currentCurrency?: string,
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

      if (currentCurrency) {
        await syncEquipmentToLibrary(payload, currentCurrency);
      }
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

  const handleDuplicate = useCallback(
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

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem({ id });
    },
    [deleteItem],
  );

  const handleUpdateField = useCallback(
    async (id: string, field: Partial<EquipmentItem>) => {
      await updateItem({ id, ...field });
    },
    [updateItem],
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      await bulkDeleteMutation(ids);
    },
    [bulkDeleteMutation],
  );

  const handleBulkMove = useCallback(
    async (ids: string[], groupId: string | null) => {
      await bulkMoveMutation({ ids, data: { group_id: groupId } });
    },
    [bulkMoveMutation],
  );

  return {
    handleAddOrUpdate,
    handleDuplicate,
    handleDelete,
    handleUpdateField,
    handleBulkDelete,
    handleBulkMove,
    isAdding,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    isBulkMoving,
    data: equipment,
    isLoading,
    error,
  };
}