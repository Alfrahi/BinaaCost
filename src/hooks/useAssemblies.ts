import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/lib/pb-mapper";
import { useAuth } from "@/components/AuthProvider";
import { Assembly } from "@/types/assemblies";
import { handleError } from "@/utils/toast";
import { useOfflinePb } from "./useOfflinePb";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

export function useAssemblies() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflinePb();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: allAssemblies = [], isLoading } = useQuery<Assembly[]>({
    queryKey: ["all_assemblies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const records = await pb.collection("cost_assemblies").getFullList({
        filter: `user_id="${user.id}"`,
        sort: "name",
      });
      return mapRecords<Assembly>(records);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const filteredAssemblies = useMemo(() => {
    return allAssemblies.filter(
      (a: Assembly) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase()) ||
        a.category?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allAssemblies, search]);

  const paginatedAssemblies = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAssemblies.slice(start, start + pageSize);
  }, [filteredAssemblies, currentPage, pageSize]);

  const totalPages = useMemo(
    () => Math.ceil(filteredAssemblies.length / pageSize),
    [filteredAssemblies, pageSize],
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [search, pageSize]);

  const optimisticSingleUpdater = (
    old: Assembly[] | undefined,
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
      return oldData.map((assembly) =>
        assembly.id === variables.id
          ? {
              ...assembly,
              ...variables,
              updated_at: new Date().toISOString(),
            }
          : assembly,
      );
    }
    if (operation === "DELETE") {
      return oldData.filter((assembly) => assembly.id !== variables.id);
    }
    return oldData;
  };

  const createAssembly = useOfflineMutation<
    Omit<Assembly, "id" | "user_id" | "created_at" | "updated_at"> & {
      id?: string;
      user_id?: string;
    },
    Assembly[]
  >({
    queryKey: ["all_assemblies", user?.id],
    table: "cost_assemblies",
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {},
    onError: (err) => handleError(err),
  });

  const updateAssembly = useOfflineMutation<
    Partial<Assembly> & { id: string },
    Assembly[]
  >({
    queryKey: ["all_assemblies", user?.id],
    table: "cost_assemblies",
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {},
    onError: (err) => handleError(err),
  });

  const deleteAssembly = useOfflineMutation<{ id: string }, Assembly[]>({
    queryKey: ["all_assemblies", user?.id],
    table: "cost_assemblies",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly_items"] });
    },
    onError: (err) => handleError(err),
  });

  return {
    allAssemblies,
    assemblies: paginatedAssemblies,
    isLoading,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    createAssembly,
    updateAssembly,
    deleteAssembly,
    PAGE_SIZE_OPTIONS,
  };
}
