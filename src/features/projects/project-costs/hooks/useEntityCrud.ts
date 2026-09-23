import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { handleError } from "@/shared/lib/toast";

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
  total_cost?: number | null;
}

export interface EntityCrud<T extends BaseEntity> {
  handleAddOrUpdate: (
    data: any,
    currency?: string,
    editingId?: string,
    saveToLibrary?: boolean,
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

interface UseEntityCrudOptions<T> {
  table: string;
  projectId: string;
  calculateOptimisticTotalCost?: (item: Partial<T>) => number;
}

export function createOptimisticSingleUpdater<T extends BaseEntity>(
  calculateOptimisticTotalCost?: (item: Partial<T>) => number,
) {
  return (old: T[] | undefined, variables: Partial<T>, operation: string): T[] => {
    const oldData = old ?? [];
    if (operation === "INSERT") {
      const newId = variables.id || crypto.randomUUID();
      const insertVars = { ...variables, id: newId } as unknown as Partial<T>;
      return [
        ...oldData,
        {
          ...variables,
          id: newId,
          ...(calculateOptimisticTotalCost
            ? { total_cost: calculateOptimisticTotalCost(insertVars) }
            : {}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        } as unknown as T,
      ];
    }
    if (operation === "UPDATE") {
      return oldData.map((item) => {
        if (item.id !== variables.id) return item;
        const merged = { ...item, ...variables } as unknown as Partial<T>;
        return {
          ...item,
          ...variables,
          ...(calculateOptimisticTotalCost
            ? { total_cost: calculateOptimisticTotalCost(merged) }
            : {}),
          updated_at: new Date().toISOString(),
        } as unknown as T;
      });
    }
    if (operation === "DELETE") {
      return oldData.filter((item) => item.id !== variables.id);
    }
    return oldData;
  };
}

export function useEntityCrud<T extends BaseEntity>({
  table,
  projectId,
  calculateOptimisticTotalCost,
}: UseEntityCrudOptions<T>) {
  const { t } = useTranslation(["common"]);
  const queryClient = useQueryClient();
  const { useMutation: useOfflineMutation } = useOfflinePb();

  const queryKey = useMemo(() => [table, projectId], [table, projectId]);

  const optimisticSingleUpdater = useMemo(
    () => createOptimisticSingleUpdater<T>(calculateOptimisticTotalCost),
    [calculateOptimisticTotalCost],
  );

  const optimisticBulkUpdater = useCallback(
    (old: T[] | undefined, variables: unknown, operation: string) => {
      const oldData = old ?? [];
      if (operation === "BULK_DELETE") {
        const idsToDelete = variables as string[];
        return oldData.filter(
          (item) => !idsToDelete.includes(item.id),
        );
      }
      if (operation === "BULK_UPDATE") {
        const { ids, data } = variables as { ids: string[]; data: Partial<T> };
        return oldData.map((item) =>
          ids.includes(item.id)
            ? ({ ...item, ...data, updated_at: new Date().toISOString() } as unknown as T)
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
    queryClient.invalidateQueries({ queryKey: ["projectCardSummary", projectId] });
    queryClient.invalidateQueries({ queryKey: queryKey });
  }, [t, queryClient, projectId, queryKey]);

  const { mutate: addItem, isPending: isAdding } = useOfflineMutation<
    Partial<T>,
    T[]
  >({
    queryKey,
    table,
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess,
    onError: (err: Error) => handleError(err),
  });

  const { mutate: updateItem, isPending: isUpdating } = useOfflineMutation<
    Partial<T>,
    T[]
  >({
    queryKey,
    table,
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess,
    onError: (err: Error) => handleError(err),
  });

  const {
    mutate: deleteItem,
    mutateAsync: deleteItemAsync,
    isPending: isDeleting,
  } = useOfflineMutation<Partial<T>, T[]>({
    queryKey,
    table,
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess,
    onError: (err: Error) => handleError(err),
  });

  const {
    mutate: bulkDeleteMutation,
    mutateAsync: bulkDeleteMutationAsync,
    isPending: isBulkDeleting,
  } = useOfflineMutation<string[], T[]>({
    queryKey,
    table,
    operation: "BULK_DELETE",
    optimisticUpdater: optimisticBulkUpdater as any, // Type coercion required for multi-type offline mutation
    onSuccess,
    onError: (err: Error) => handleError(err),
  });

  const { mutate: bulkMoveMutation, isPending: isBulkMoving } =
    useOfflineMutation<{ ids: string[]; data: Partial<T> }, T[]>({
      queryKey,
      table,
      operation: "BULK_UPDATE",
      optimisticUpdater: optimisticBulkUpdater as any,
      onSuccess,
      onError: (err: Error) => handleError(err),
    });

  return {
    addItem,
    updateItem,
    deleteItem: (deleteItemAsync || deleteItem) as any,
    bulkDeleteMutation: (bulkDeleteMutationAsync || bulkDeleteMutation) as any,
    bulkMoveMutation,
    isAdding,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    isBulkMoving,
  };
}
