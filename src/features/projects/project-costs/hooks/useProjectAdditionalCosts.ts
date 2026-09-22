import { useCallback } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useAuth } from "@/features/auth";
import { useEntityCrud, EntityCrud } from "@/features/projects/project-costs/hooks/useEntityCrud";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { AdditionalCostItem } from "@/features/projects/project-costs/types/items";
import { AdditionalCostFormValues } from "@/features/projects/project-costs/types/schemas";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { STALE_TIME } from "@/shared/lib/queryDefaults";

interface UseProjectAdditionalCostsReturn extends EntityCrud<AdditionalCostItem> {
  data: AdditionalCostItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjectAdditionalCosts(
  projectId: string,
): UseProjectAdditionalCostsReturn {
  const { user } = useAuth();
  const { useQuery } = useOfflinePb();

  const { data: additionalCosts = [], isLoading, error } = useQuery<AdditionalCostItem[]>({
    queryKey: ["additional_costs", projectId],
    queryFn: async () => mapRecords<AdditionalCostItem>(
      await pb.collection("additional_costs").getFullList({ filter: `project_id="${projectId}"` }),
    ),
    enabled: !!projectId,
    staleTime: STALE_TIME.ENTITY,
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
  } = useEntityCrud<AdditionalCostItem>({
    table: "additional_costs",
    projectId,
  });

  const handleAddOrUpdate = useCallback(
    async (
      data: AdditionalCostFormValues,
      _currency?: string,
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
        const currentItem = additionalCosts.find(c => c.id === editingAdditionalCostId);
        await updateItem({ id: editingAdditionalCostId, ...payload, version: currentItem?.version });
      } else {
        await addItem({
          id: crypto.randomUUID(),
          project_id: projectId,
          user_id: user?.id,
          ...payload,
        });
      }
    },
    [addItem, updateItem, additionalCosts, projectId, user?.id],
  );

  const handleDuplicate = useCallback(
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

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem({ id });
    },
    [deleteItem],
  );

  const handleUpdateField = useCallback(
    async (id: string, field: Partial<AdditionalCostItem>) => {
      const currentItem = additionalCosts.find(c => c.id === id);
      await updateItem({ id, ...field, version: currentItem?.version });
    },
    [updateItem, additionalCosts],
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
    data: additionalCosts,
    isLoading,
    error,
  };
}