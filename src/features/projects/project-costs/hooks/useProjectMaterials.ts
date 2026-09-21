import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useAuth } from "@/features/auth";
import { useEntityCrud, EntityCrud } from "@/features/projects/project-costs/hooks/useEntityCrud";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { useSyncToLibrary } from "@/features/projects/project-costs/hooks/useSyncToLibrary";
import { calculateItemCost } from "@/shared/logic/shared";
import { MaterialItem } from "@/features/projects/project-costs/types/items";
import { MaterialFormValues } from "@/features/projects/project-costs/types/schemas";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { STALE_TIME } from "@/shared/lib/queryDefaults";

interface UseProjectMaterialsReturn extends EntityCrud<MaterialItem> {
  data: MaterialItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjectMaterials(projectId: string): UseProjectMaterialsReturn {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useQuery } = useOfflinePb();

  const { data: materials = [], isLoading, error } = useQuery<MaterialItem[]>({
    queryKey: ["materials", projectId],
    queryFn: async () => mapRecords<MaterialItem>(
      await pb.collection("materials").getFullList({ filter: `project_id="${projectId}"` }),
    ),
    enabled: !!projectId,
    staleTime: STALE_TIME.ENTITY,
  });

  const {
    addItem, updateItem, deleteItem,
    bulkDeleteMutation, bulkMoveMutation,
    isAdding, isUpdating, isDeleting, isBulkDeleting, isBulkMoving,
  } = useEntityCrud<MaterialItem>({
    table: "materials",
    projectId,
    calculateOptimisticTotalCost: (item) =>
      calculateItemCost.material(item.quantity || 0, item.unit_price || 0),
  });

  const { syncToLibrary } = useSyncToLibrary<
    Pick<MaterialItem, "name" | "description" | "unit" | "unit_price">
  >("upsert/library_materials", (item, convertToUSD, userId) => ({
    name: sanitizeText(item.name),
    description: sanitizeText(item.description),
    unit: sanitizeText(item.unit),
    unit_price: convertToUSD(item.unit_price),
    user_id: userId,
    updated_at: new Date().toISOString(),
  }));

  const handleAddOrUpdate = useCallback(
    async (
      data: MaterialFormValues,
      currentCurrency?: string,
      editingId?: string,
      saveToLibrary: boolean = false,
    ) => {
      const payload = {
        name: sanitizeText(data.name),
        description: sanitizeText(data.description),
        quantity: data.quantity,
        unit: sanitizeText(data.unit),
        unit_price: data.unit_price,
        group_id: data.group_id === "ungrouped" || !data.group_id ? null : data.group_id,
      };
      if (editingId) {
        await updateItem({ id: editingId, ...payload });
      } else {
        await addItem({ id: crypto.randomUUID(), project_id: projectId, user_id: user?.id, ...payload });
      }
      if (saveToLibrary && currentCurrency) {
        await syncToLibrary({ name: payload.name, description: payload.description ?? "", unit: payload.unit, unit_price: payload.unit_price }, currentCurrency);
        queryClient.invalidateQueries({ queryKey: ["library_materials"] });
      }
    },
    [addItem, updateItem, projectId, user?.id, syncToLibrary, queryClient],
  );

  const handleDuplicate = useCallback(
    (item: MaterialItem) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = item;
      addItem({ ...rest, id: crypto.randomUUID(), project_id: projectId, user_id: user?.id });
    },
    [addItem, projectId, user?.id],
  );

  const handleDelete = useCallback(async (id: string) => { await deleteItem({ id }); }, [deleteItem]);
  const handleUpdateField = useCallback(async (id: string, field: Partial<MaterialItem>) => { await updateItem({ id, ...field }); }, [updateItem]);
  const handleBulkDelete = useCallback(async (ids: string[]) => { await bulkDeleteMutation(ids); }, [bulkDeleteMutation]);
  const handleBulkMove = useCallback(async (ids: string[], groupId: string | null) => { await bulkMoveMutation({ ids, data: { group_id: groupId } }); }, [bulkMoveMutation]);

  return { handleAddOrUpdate, handleDuplicate, handleDelete, handleUpdateField, handleBulkDelete, handleBulkMove, isAdding, isUpdating, isDeleting, isBulkDeleting, isBulkMoving, data: materials, isLoading, error };
}