import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callRoute } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { useEntityCrud, EntityCrud } from "@/shared/hooks/useEntityCrud";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { calculateItemCost } from "@/shared/logic/shared";
import { MaterialItem } from "@/features/projects/project-costs/types/items";
import { MaterialFormValues } from "@/features/projects/project-costs/types/schemas";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { sanitizeText } from "@/shared/lib/sanitizeText";

interface UseProjectMaterialsReturn extends EntityCrud<MaterialItem> {
  data: MaterialItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useProjectMaterials(projectId: string): UseProjectMaterialsReturn {
  const { t } = useTranslation(["project_materials", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { convert, getMissingRates } = useCurrencyConverter();
  const { useQuery } = useOfflinePb();

  const { data: materials = [], isLoading, error } = useQuery<MaterialItem[]>({
    queryKey: ["materials", projectId],
    queryFn: async () => {
      const pb = (await import("@/integrations/pocketbase/client")).pb;
      const records = await pb.collection("materials").getFullList({
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
  } = useEntityCrud<MaterialItem>({
    table: "materials",
    projectId,
    calculateOptimisticTotalCost: (item) =>
      calculateItemCost.material(item.quantity || 0, item.unit_price || 0),
  });

  const syncMaterialToLibrary = useCallback(
    async (
      material: Omit<
        MaterialItem,
        | "id"
        | "user_id"
        | "created_at"
        | "updated_at"
        | "project_id"
        | "group_id"
        | "total_cost"
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
        name: sanitizeText(material.name),
        description: sanitizeText(material.description),
        unit: sanitizeText(material.unit),
        unit_price: convert(material.unit_price, projectCurrency, "USD"),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      await callRoute("upsert/library_materials", itemToUpsert);
    },
    [user?.id, t, getMissingRates, convert],
  );

  const handleAddOrUpdate = useCallback(
    async (
      data: MaterialFormValues,
      currentCurrency?: string,
      editingMaterialId?: string,
    ) => {
      const payload = {
        name: sanitizeText(data.name),
        description: sanitizeText(data.description),
        quantity: data.quantity,
        unit: sanitizeText(data.unit),
        unit_price: data.unit_price,
        group_id:
          data.group_id === "ungrouped" || !data.group_id
            ? null
            : data.group_id,
      };

      if (editingMaterialId) {
        await updateItem({ id: editingMaterialId, ...payload });
      } else {
        await addItem({
          id: crypto.randomUUID(),
          project_id: projectId,
          user_id: user?.id,
          ...payload,
        });
      }

      if (currentCurrency) {
        await syncMaterialToLibrary(payload, currentCurrency);
      }
      queryClient.invalidateQueries({ queryKey: ["library_materials"] });
    },
    [
      addItem,
      updateItem,
      projectId,
      user?.id,
      syncMaterialToLibrary,
      queryClient,
    ],
  );

  const handleDuplicate = useCallback(
    (item: MaterialItem) => {
      const payload: Omit<
        MaterialItem,
        "id" | "total_cost" | "created_at" | "updated_at"
      > = { ...item };
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
    async (id: string, field: Partial<MaterialItem>) => {
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
    data: materials,
    isLoading,
    error,
  };
}