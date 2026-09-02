import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callRoute } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { useOfflineSupabase } from "@/hooks/useOfflineSupabase";
import { handleError } from "@/utils/toast";
import { calculateItemCost } from "@/logic/shared";
import { MaterialItem } from "@/types/project-items";
import { MaterialFormValues } from "@/types/schemas";
import { useCurrencyConverter } from "./useCurrencyConverter";
import { sanitizeText } from "@/utils/sanitizeText";

export function useProjectMaterials(projectId: string) {
  const { t } = useTranslation(["project_materials", "common"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflineSupabase();
  const { convert, getMissingRates } = useCurrencyConverter();

  const queryKey = ["materials", projectId];

  const calculateOptimisticTotalCost = useCallback((item: any) => {
    return calculateItemCost.material(item.quantity || 0, item.unit_price || 0);
  }, []);

  const optimisticSingleUpdater = useCallback(
    (old: MaterialItem[] | undefined, variables: any, operation: string) => {
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
    MaterialItem[]
  >({
    queryKey,
    table: "materials",
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
    MaterialItem[]
  >({
    queryKey,
    table: "materials",
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
    MaterialItem[]
  >({
    queryKey,
    table: "materials",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    },
    onError: (err: any) => handleError(err),
  });

  const optimisticBulkUpdater = useCallback(
    (old: MaterialItem[] | undefined, variables: any, operation: string) => {
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
    useOfflineMutation<string[], MaterialItem[]>({
      queryKey,
      table: "materials",
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
    useOfflineMutation<{ ids: string[]; data: any }, MaterialItem[]>({
      queryKey,
      table: "materials",
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

  const handleAddOrUpdateMaterial = useCallback(
    async (
      data: MaterialFormValues,
      currentCurrency: string,
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

      await syncMaterialToLibrary(payload, currentCurrency);
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

  const handleDuplicateMaterial = useCallback(
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

  const handleDeleteMaterial = useCallback(
    async (id: string) => {
      await deleteItem({ id });
    },
    [deleteItem],
  );

  const handleBulkDeleteMaterials = useCallback(
    async (ids: string[]) => {
      await bulkDeleteMutation(ids);
    },
    [bulkDeleteMutation],
  );

  const handleBulkMoveMaterials = useCallback(
    async (ids: string[], groupId: string | null) => {
      await bulkMoveMutation({ ids, data: { group_id: groupId } });
    },
    [bulkMoveMutation],
  );

  return {
    handleAddOrUpdateMaterial,
    handleDuplicateMaterial,
    handleDeleteMaterial,
    handleBulkDeleteMaterials,
    handleBulkMoveMaterials,
    isAddingMaterial: isAdding,
    isUpdatingMaterial: isUpdating,
    isDeletingMaterial: isDeleting,
    isBulkDeletingMaterials: isBulkDeleting,
    isBulkMovingMaterials: isBulkMoving,
  };
}
