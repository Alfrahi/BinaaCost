import { useCallback } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useEntityCrud, EntityCrud } from "@/shared/hooks/useEntityCrud";
import { AdditionalCostItem } from "@/types/project-items";
import { AdditionalCostFormValues } from "@/types/schemas";
import { sanitizeText } from "@/shared/lib/sanitizeText";

export function useProjectAdditionalCosts(
  projectId: string,
): EntityCrud<AdditionalCostItem> {
  const { user } = useAuth();

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
  };
}