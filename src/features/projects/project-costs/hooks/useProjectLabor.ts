import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useAuth } from "@/features/auth";
import { useEntityCrud, EntityCrud } from "@/features/projects/project-costs/hooks/useEntityCrud";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { useSyncToLibrary } from "@/features/projects/project-costs/hooks/useSyncToLibrary";
import { calculateItemCost } from "@/shared/logic/shared";
import { LaborItem } from "@/features/projects/project-costs/types/items";
import { LaborFormValues } from "@/features/projects/project-costs/types/schemas";
import { sanitizeText } from "@/shared/lib/sanitizeText";

interface UseProjectLaborReturn extends EntityCrud<LaborItem> {
  data: LaborItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjectLabor(projectId: string): UseProjectLaborReturn {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useQuery } = useOfflinePb();

  const { data: labor = [], isLoading, error } = useQuery<LaborItem[]>({
    queryKey: ["labor_items", projectId],
    queryFn: async () => mapRecords<LaborItem>(
      await pb.collection("labor_items").getFullList({ filter: `project_id="${projectId}"` }),
    ),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  });

  const {
    addItem, updateItem, deleteItem,
    bulkDeleteMutation, bulkMoveMutation,
    isAdding, isUpdating, isDeleting, isBulkDeleting, isBulkMoving,
  } = useEntityCrud<LaborItem>({
    table: "labor_items",
    projectId,
    calculateOptimisticTotalCost: (item) =>
      calculateItemCost.labor(item.number_of_workers || 0, item.daily_rate || 0, item.total_days || 0),
  });

  const { syncToLibrary } = useSyncToLibrary<
    Pick<LaborItem, "worker_type" | "daily_rate">
  >("upsert/library_labor", (item, convertToUSD, userId) => ({
    worker_type: sanitizeText(item.worker_type),
    daily_rate: convertToUSD(item.daily_rate),
    user_id: userId,
    updated_at: new Date().toISOString(),
  }));

  const handleAddOrUpdate = useCallback(
    async (
      data: LaborFormValues,
      currentCurrency?: string,
      editingId?: string,
      saveToLibrary: boolean = false,
    ) => {
      const payload = {
        worker_type: sanitizeText(data.worker_type),
        number_of_workers: data.number_of_workers,
        daily_rate: data.daily_rate,
        total_days: data.total_days,
        description: sanitizeText(data.description),
        group_id: data.group_id === "ungrouped" || !data.group_id ? null : data.group_id,
      };
      if (editingId) {
        await updateItem({ id: editingId, ...payload });
      } else {
        await addItem({ id: crypto.randomUUID(), project_id: projectId, user_id: user?.id, ...payload });
      }
      if (saveToLibrary && currentCurrency) {
        await syncToLibrary({ worker_type: payload.worker_type, daily_rate: payload.daily_rate }, currentCurrency);
        queryClient.invalidateQueries({ queryKey: ["library_labor"] });
      }
    },
    [addItem, updateItem, projectId, user?.id, syncToLibrary, queryClient],
  );

  const handleDuplicate = useCallback(
    (item: LaborItem) => {
      const { id: _id, total_cost: _tc, created_at: _ca, updated_at: _ua, ...rest } = item;
      addItem({ ...rest, id: crypto.randomUUID(), project_id: projectId, user_id: user?.id });
    },
    [addItem, projectId, user?.id],
  );

  const handleDelete = useCallback(async (id: string) => { await deleteItem({ id }); }, [deleteItem]);
  const handleUpdateField = useCallback(async (id: string, field: Partial<LaborItem>) => { await updateItem({ id, ...field }); }, [updateItem]);
  const handleBulkDelete = useCallback(async (ids: string[]) => { await bulkDeleteMutation(ids); }, [bulkDeleteMutation]);
  const handleBulkMove = useCallback(async (ids: string[], groupId: string | null) => { await bulkMoveMutation({ ids, data: { group_id: groupId } }); }, [bulkMoveMutation]);

  return { handleAddOrUpdate, handleDuplicate, handleDelete, handleUpdateField, handleBulkDelete, handleBulkMove, isAdding, isUpdating, isDeleting, isBulkDeleting, isBulkMoving, data: labor, isLoading, error };
}