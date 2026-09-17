import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/shared/lib/pb-mapper";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";

interface UseLibrarySyncManagerProps {
  tableName: string;
  queryKey: string[];
  userId: string | undefined;
  page: number;
  pageSize: number;
  /** Ignored; PocketBase always returns the full record. Kept so callers passing select="*" don't need to change. */
  select?: string;
  order: string;
  searchTerm?: string;
  searchColumn?: string;
}

export function useLibrarySyncManager({
  tableName,
  queryKey,
  userId,
  page,
  pageSize,
  order,
  searchTerm,
  searchColumn,
}: UseLibrarySyncManagerProps) {
  const queryClient = useQueryClient();
  const { useMutation: useOfflineMutation } = useOfflinePb();

  const itemsQuery = useQuery({
    queryKey: [...queryKey, page, pageSize, searchTerm],
    queryFn: async () => {
      if (!userId) return { data: [], count: 0 };

      let filter = `user_id="${userId}"`;
      if (searchTerm && searchColumn) {
        const term = searchTerm.replace(/"/g, '\\"');
        filter += ` && ${searchColumn}~"${term}"`;
      }

      const result = await pb
        .collection(tableName)
        .getList(page + 1, pageSize, { filter, sort: order });
      return { data: mapRecords(result.items), count: result.totalItems };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const optimisticSingleUpdater = (
    old: any,
    variables: any,
    operation: string,
  ) => {
    const oldData = old?.data ?? [];
    const oldCount = old?.count ?? 0;
    if (operation === "INSERT" || operation === "UPSERT") {
      return {
        data: [
          ...oldData,
          {
            ...variables,
            id: variables.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        count: oldCount + 1,
      };
    }
    if (operation === "UPDATE") {
      return {
        data: oldData.map((item: any) =>
          item.id === variables.id
            ? {
                ...item,
                ...variables,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
        count: oldCount,
      };
    }
    if (operation === "DELETE") {
      return {
        data: oldData.filter((item: any) => item.id !== variables.id),
        count: oldCount - 1,
      };
    }
    return { data: oldData, count: oldCount };
  };

  // UPSERT executor resolves onConflict keys server-side via the
  // upsert/<table> JSVM routes (library sync routes, registered in Phase 3).
  const createItem = useOfflineMutation<any, any>({
    queryKey: queryKey,
    table: tableName,
    operation: "UPSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey }),
  });

  const updateItem = useOfflineMutation<any, any>({
    queryKey: queryKey,
    table: tableName,
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey }),
  });

  const deleteItem = useOfflineMutation<any, any>({
    queryKey: queryKey,
    table: tableName,
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey }),
  });

  const optimisticBulkUpdater = (
    old: any,
    variables: any,
    operation: string,
  ) => {
    const oldData = old?.data ?? [];
    const oldCount = old?.count ?? 0;
    if (operation === "BULK_DELETE") {
      const idsToDelete = variables as string[];
      const newData = oldData.filter(
        (item: any) => !idsToDelete.includes(item.id),
      );
      return {
        data: newData,
        count: oldCount - idsToDelete.length,
      };
    }
    return { data: oldData, count: oldCount };
  };

  const deleteItems = useOfflineMutation<string[], any>({
    queryKey: queryKey,
    table: tableName,
    operation: "BULK_DELETE",
    optimisticUpdater: optimisticBulkUpdater,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKey }),
  });

  return {
    itemsQuery,
    createItem,
    updateItem,
    deleteItem,
    deleteItems,
  };
}
