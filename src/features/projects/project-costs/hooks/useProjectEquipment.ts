import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useAuth } from "@/features/auth";
import { useEntityCrud, EntityCrud } from "@/features/projects/project-costs/hooks/useEntityCrud";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { useSyncToLibrary } from "@/features/projects/project-costs/hooks/useSyncToLibrary";
import { calculateItemCost } from "@/shared/logic/shared";
import { EquipmentItem } from "@/features/projects/project-costs/types/items";
import { EquipmentFormValues } from "@/features/projects/project-costs/types/schemas";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { STALE_TIME } from "@/shared/lib/queryDefaults";

interface UseProjectEquipmentReturn extends EntityCrud<EquipmentItem> {
  data: EquipmentItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjectEquipment(projectId: string): UseProjectEquipmentReturn {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useQuery } = useOfflinePb();

  const { data: equipment = [], isLoading, error } = useQuery<EquipmentItem[]>({
    queryKey: ["equipment_items", projectId],
    queryFn: async () => mapRecords<EquipmentItem>(
      await pb.collection("equipment_items").getFullList({ filter: `project_id="${projectId}"` }),
    ),
    enabled: !!projectId,
    staleTime: STALE_TIME.ENTITY,
  });

  const {
    addItem, updateItem, deleteItem,
    bulkDeleteMutation, bulkMoveMutation,
    isAdding, isUpdating, isDeleting, isBulkDeleting, isBulkMoving,
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
        rentalOrPurchase: item.rental_or_purchase,
      }).totalCost,
  });

  const { syncToLibrary } = useSyncToLibrary<
    Pick<EquipmentItem, "name" | "type" | "rental_or_purchase" | "cost_per_period" | "period_unit">
  >("upsert/library_equipment", (item, convertToUSD, userId) => ({
    name: sanitizeText(item.name),
    type: sanitizeText(item.type),
    rental_or_purchase: sanitizeText(item.rental_or_purchase),
    cost_per_period: convertToUSD(item.cost_per_period),
    period_unit: sanitizeText(item.period_unit),
    user_id: userId,
    updated_at: new Date().toISOString(),
  }));

  const handleAddOrUpdate = useCallback(
    async (
      data: EquipmentFormValues,
      currentCurrency?: string,
      editingId?: string,
      saveToLibrary: boolean = false,
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
        group_id: data.group_id === "ungrouped" || !data.group_id ? null : data.group_id,
      };
      if (editingId) {
        const currentItem = equipment.find((e) => e.id === editingId);
        await updateItem({ id: editingId, ...payload, version: currentItem?.version });
      } else {
        await addItem({ id: crypto.randomUUID(), project_id: projectId, user_id: user?.id, ...payload });
      }
      if (saveToLibrary && currentCurrency) {
        await syncToLibrary({ name: payload.name, type: payload.type, rental_or_purchase: payload.rental_or_purchase, cost_per_period: payload.cost_per_period, period_unit: payload.period_unit }, currentCurrency);
        queryClient.invalidateQueries({ queryKey: ["library_equipment"] });
      }
    },
    [addItem, updateItem, projectId, user?.id, syncToLibrary, queryClient],
  );

  const handleDuplicate = useCallback(
    (item: EquipmentItem) => {
      const { id: _id, total_cost: _tc, created_at: _ca, updated_at: _ua, ...rest } = item;
      addItem({ ...rest, id: crypto.randomUUID(), project_id: projectId, user_id: user?.id });
    },
    [addItem, projectId, user?.id],
  );

  const handleDelete = useCallback(async (id: string) => { await deleteItem({ id }); }, [deleteItem]);
  const handleUpdateField = useCallback(async (id: string, field: Partial<EquipmentItem>) => { 
    const currentItem = equipment.find((e) => e.id === id);
    await updateItem({ id, ...field, version: currentItem?.version }); 
  }, [updateItem, equipment]);
  const handleBulkDelete = useCallback(async (ids: string[]) => { await bulkDeleteMutation(ids); }, [bulkDeleteMutation]);
  const handleBulkMove = useCallback(async (ids: string[], groupId: string | null) => { await bulkMoveMutation({ ids, data: { group_id: groupId } }); }, [bulkMoveMutation]);

  return { handleAddOrUpdate, handleDuplicate, handleDelete, handleUpdateField, handleBulkDelete, handleBulkMove, isAdding, isUpdating, isDeleting, isBulkDeleting, isBulkMoving, data: equipment, isLoading, error };
}