import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callRoute } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { useEntityCrud, EntityCrud } from "@/shared/hooks/useEntityCrud";
import { calculateItemCost } from "@/shared/logic/shared";
import { LaborItem } from "@/features/projects/project-costs/types/items";
import { LaborFormValues } from "@/features/projects/project-costs/types/schemas";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { sanitizeText } from "@/shared/lib/sanitizeText";

export function useProjectLabor(projectId: string): EntityCrud<LaborItem> {
  const { t } = useTranslation(["project_labor", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { convert, getMissingRates } = useCurrencyConverter();

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
  } = useEntityCrud<LaborItem>({
    table: "labor_items",
    projectId,
    calculateOptimisticTotalCost: (item) =>
      calculateItemCost.labor(
        item.number_of_workers || 0,
        item.daily_rate || 0,
        item.total_days || 0,
      ),
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

  const handleAddOrUpdate = useCallback(
    async (
      data: LaborFormValues,
      currentCurrency?: string,
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

      if (currentCurrency) {
        await syncLaborToLibrary(payload, currentCurrency);
      }
      queryClient.invalidateQueries({ queryKey: ["library_labor"] });
    },
    [
      addItem,
      updateItem,
      projectId,
      user?.id,
      syncLaborToLibrary,
      queryClient,
    ],
  );

  const handleDuplicate = useCallback(
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

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem({ id });
    },
    [deleteItem],
  );

  const handleUpdateField = useCallback(
    async (id: string, field: Partial<LaborItem>) => {
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