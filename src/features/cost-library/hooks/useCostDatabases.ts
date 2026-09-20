import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useAuth } from "@/features/auth";
import { CostDatabase } from "@/features/cost-library/databases/types/databases";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";

export function useCostDatabases() {
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflinePb();

  const queryKey = ["cost_databases"];

  const databasesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const records = await pb.collection("cost_databases").getFullList({
        sort: "-is_public,name",
      });
      return mapRecords<CostDatabase>(records) as CostDatabase[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const optimisticSingleUpdater = (
    old: CostDatabase[] | undefined,
    variables: any,
    operation: string,
  ) => {
    const oldData = old ?? [];
    if (operation === "INSERT") {
      return [
        ...oldData,
        {
          ...variables,
          id: variables.id || crypto.randomUUID(),
          user_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }
    if (operation === "UPDATE") {
      return oldData.map((db) =>
        db.id === variables.id
          ? { ...db, ...variables, updated_at: new Date().toISOString() }
          : db,
      );
    }
    if (operation === "DELETE") {
      return oldData.filter((db) => db.id !== variables.id);
    }
    return oldData;
  };

  const rawCreateDatabase = useOfflineMutation<
    {
      name: string;
      description?: string;
      is_public?: boolean;
      currency?: string;
      user_id?: string;
    },
    CostDatabase[]
  >({
    queryKey,
    table: "cost_databases",
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {},
  });

  const createDatabase = useMemo(
    () => ({
      ...rawCreateDatabase,
      mutate: (
        variables: {
          name: string;
          description?: string;
          is_public?: boolean;
          currency?: string;
          user_id?: string;
        },
        options?: any,
      ) => {
        const payload = {
          ...variables,
          user_id: variables.user_id || user?.id,
        };
        return rawCreateDatabase.mutate(payload, options);
      },
      mutateAsync: (
        variables: {
          name: string;
          description?: string;
          is_public?: boolean;
          currency?: string;
          user_id?: string;
        },
        options?: any,
      ) => {
        const payload = {
          ...variables,
          user_id: variables.user_id || user?.id,
        };
        return rawCreateDatabase.mutateAsync(payload, options);
      },
    }),
    [rawCreateDatabase, user?.id],
  );

  const updateDatabase = useOfflineMutation<
    Partial<CostDatabase> & { id: string },
    CostDatabase[]
  >({
    queryKey,
    table: "cost_databases",
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {},
  });

  const deleteDatabase = useOfflineMutation<{ id: string }, CostDatabase[]>({
    queryKey,
    table: "cost_databases",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {},
  });

  return {
    databasesQuery,
    createDatabase,
    updateDatabase,
    deleteDatabase,
  };
}
