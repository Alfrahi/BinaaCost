import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { handleError } from "@/shared/lib/toast";

/**
 * Normalized CRUD surface shared by every project line-item entity
 * (materials, labor, equipment, additional costs). Entity hooks build this
 * from `useEntityCrud` and add their own payload mapping / library sync.
 */
export interface EntityCrud<T> {
  handleAddOrUpdate: (
    data: any,
    currency?: string,
    editingId?: string,
  ) => Promise<void>;
  handleDuplicate: (item: T) => void;
  handleDelete: (id: string) => Promise<void>;
  handleUpdateField: (id: string, field: Partial<T>) => Promise<void>;
  handleBulkDelete: (ids: string[]) => Promise<void>;
  handleBulkMove: (ids: string[], groupId: string | null) => Promise<void>;
  isAdding: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isBulkDeleting: boolean;
  isBulkMoving: boolean;
}

interface UseEntityCrudOptions {
  table: string;
  projectId: string;
  /** Optional: compute the optimistic `total_cost` for INSERT/UPDATE. */
  calculateOptimisticTotalCost?: (item: any) => number;
}

/**
 * Shared offline-first CRUD mutations for a project line-item table.
 * Encapsulates the optimistic updaters, bulk operations, success toast and
 * analytics invalidation that were previously duplicated across the four
 * entity hooks.
 */
export function useEntityCrud<T>({
  table,
  projectId,
  calculateOptimisticTotalCost,
}: UseEntityCrudOptions) {
  const { t } = useTranslation(["common"]);
  const queryClient = useQueryClient();
  const { useMutation: useOfflineMutation } = useOfflinePb();

  const queryKey = useMemo(() => [table, projectId], [table, projectId]);

  const optimisticSingleUpdater = useCallback(
    (old: T[] | undefined, variables: any, operation: string) => {
      const oldData = old ?? [];
      if (operation === "INSERT") {
        return [
          ...oldData,
          {
            ...variables,
            id: variables.id || crypto.randomUUID(),
            ...(calculateOptimisticTotalCost
              ? { total_cost: calculateOptimisticTotalCost(variables) }
              : {}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
      if (operation === "UPDATE") {
        return oldData.map((item) =>
          (item as any).id === variables.id
            ? {
                ...item,
                ...variables,
                ...(calculateOptimisticTotalCost
                  ? { total_cost: calculateOptimisticTotalCost(variables) }
                  : {}),
                updated_at: new Date().toISOString(),
              }
            : item,
        );
      }
      if (operation === "DELETE") {
        return oldData.filter((item) => (item as any).id !== variables.id);
      }
      return oldData;
    },
    [calculateOptimisticTotalCost],
  );

  const optimisticBulkUpdater = useCallback(
    (old: T[] | undefined, variables: any, operation: string) => {
      const oldData = old ?? [];
      if (operation === "BULK_DELETE") {
        const idsToDelete = variables as string[];
        return oldData.filter(
          (item) => !idsToDelete.includes((item as any).id),
        );
      }
      if (operation === "BULK_UPDATE") {
        const { ids, data } = variables as { ids: string[]; data: any };
        return oldData.map((item) =>
          ids.includes((item as any).id)
            ? { ...item, ...data, updated_at: new Date().toISOString() }
            : item,
        );
      }
      return oldData;
    },
    [],
  );

  const onSuccess = useCallback(() => {
    toast.success(t("common:success"));
    queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: queryKey });
  }, [t, queryClient, projectId, queryKey]);

  const { mutate: addItem, isPending: isAdding } = useOfflineMutation<
    any,
    T[]
  >({
    queryKey,
    table,
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess,
    onError: (err: any) => handleError(err),
  });

  const { mutate: updateItem, isPending: isUpdating } = useOfflineMutation<
    any,
    T[]
  >({
    queryKey,
    table,
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess,
    onError: (err: any) => handleError(err),
  });

  const { mutate: deleteItem, isPending: isDeleting } = useOfflineMutation<
    any,
    T[]
  >({
    queryKey,
    table,
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess,
    onError: (err: any) => handleError(err),
  });

  const { mutate: bulkDeleteMutation, isPending: isBulkDeleting } =
    useOfflineMutation<string[], T[]>({
      queryKey,
      table,
      operation: "BULK_DELETE",
      optimisticUpdater: optimisticBulkUpdater,
      onSuccess,
      onError: (err: any) => handleError(err),
    });

  const { mutate: bulkMoveMutation, isPending: isBulkMoving } =
    useOfflineMutation<{ ids: string[]; data: any }, T[]>({
      queryKey,
      table,
      operation: "BULK_UPDATE",
      optimisticUpdater: optimisticBulkUpdater,
      onSuccess,
      onError: (err: any) => handleError(err),
    });

  return {
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
  };
}