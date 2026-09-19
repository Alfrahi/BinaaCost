import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { callRoute } from "@/integrations/pocketbase/routes";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";

export interface CostDatabaseItem {
  id: string;
  database_id: string;
  csi_division: string;
  csi_code: string;
  description: string;
  unit: string;
  unit_price: number;
}

export function useCostDatabaseItems(
  databaseId?: string,
  page = 0,
  pageSize = 50,
) {
  const queryClient = useQueryClient();
  const baseQueryKey = ["cost-database-items", databaseId];
  const queryKey = [...baseQueryKey, page, pageSize];
  const { useMutation: useOfflineMutation, useQuery: useOfflineQuery } =
    useOfflinePb();

  const itemsQuery = useOfflineQuery({
    queryKey,
    queryFn: async () => {
      if (!databaseId) return { data: [], count: 0 };
      const result = await pb.collection("cost_database_items").getList(
        page + 1, // pb is 1-based
        pageSize,
        { filter: `database_id="${databaseId}"`, sort: "csi_code" },
      );
      return {
        data: mapRecords<CostDatabaseItem>(result.items),
        count: result.totalItems,
      };
    },
    enabled: !!databaseId,
    staleTime: 1000 * 60 * 5,
  });

  const optimisticSingleUpdater = (
    old: { data: CostDatabaseItem[]; count: number } | undefined,
    variables: any,
    operation: string,
  ) => {
    const oldData = old?.data ?? [];
    const oldCount = old?.count ?? 0;
    if (operation === "INSERT") {
      return {
        data: [
          ...oldData,
          {
            ...variables,
            id: variables.id || crypto.randomUUID(),
            database_id: databaseId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        count: oldCount + 1,
      };
    }
    if (operation === "UPDATE") {
      return {
        data: oldData.map((item) =>
          item.id === variables.id
            ? { ...item, ...variables, updated_at: new Date().toISOString() }
            : item,
        ),
        count: oldCount,
      };
    }
    if (operation === "DELETE") {
      return { data: oldData.filter((i) => i.id !== variables.id), count: oldCount - 1 };
    }
    return { data: oldData, count: oldCount };
  };

  const createItem = useOfflineMutation<
    Omit<CostDatabaseItem, "id"> & { id?: string },
    { data: CostDatabaseItem[]; count: number }
  >({
    queryKey,
    table: "cost_database_items",
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: baseQueryKey }),
  });

  const updateItem = useOfflineMutation<
    Partial<CostDatabaseItem> & { id: string },
    { data: CostDatabaseItem[]; count: number }
  >({
    queryKey,
    table: "cost_database_items",
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: baseQueryKey }),
  });

  const deleteItem = useOfflineMutation<
    { id: string },
    { data: CostDatabaseItem[]; count: number }
  >({
    queryKey,
    table: "cost_database_items",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: baseQueryKey }),
  });

  const optimisticBulkUpdater = (
    old: { data: CostDatabaseItem[]; count: number } | undefined,
    variables: any,
    operation: string,
  ) => {
    const oldData = old?.data ?? [];
    const oldCount = old?.count ?? 0;
    if (operation === "BULK_DELETE") {
      const idsToDelete = variables as string[];
      const newData = oldData.filter((item) => !idsToDelete.includes(item.id));
      return {
        data: newData,
        count: oldCount - idsToDelete.length,
      };
    }
    return { data: oldData, count: oldCount };
  };

  const deleteItems = useOfflineMutation<
    string[],
    { data: CostDatabaseItem[]; count: number }
  >({
    queryKey,
    table: "cost_database_items",
    operation: "BULK_DELETE",
    optimisticUpdater: optimisticBulkUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: baseQueryKey }),
  });

  const importItems = useMutation({
    mutationFn: async ({
      items,
      strategy,
    }: {
      items: Omit<CostDatabaseItem, "id" | "database_id">[];
      strategy: "skip" | "overwrite";
    }) => {
      if (!databaseId) throw new Error("No database selected");
      await callRoute("import/cost_database_items", {
        items: items.map((i) => ({ ...i, database_id: databaseId })),
        strategy,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: baseQueryKey }),
  });

  return {
    itemsQuery,
    createItem,
    updateItem,
    deleteItem,
    deleteItems,
    importItems,
  };
}
