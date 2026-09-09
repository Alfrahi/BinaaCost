import { useState, useEffect } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { useOfflinePb } from "@/hooks/useOfflinePb";
import { useAuth } from "@/components/AuthProvider";
import { mapRecords } from "@/lib/pb-mapper";

const ITEMS_PER_PAGE = 10;

interface MyProjectData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  financial_settings: Record<string, number> | null;
  currency: string;
}

interface MyProjectsResponse {
  data: MyProjectData[];
  count: number;
}

export function useMyProjects(globalSearchTerm: string) {
  const { user } = useAuth();
  const { useQuery } = useOfflinePb();

  const [currentPage, setCurrentPage] = useState(0);

  const queryKey = ["myProjects", currentPage, globalSearchTerm, user?.id];

  const {
    data: projects = { data: [], count: 0 },
    isLoading,
    error,
  } = useQuery<MyProjectsResponse>({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };

      let filter = `user_id="${user.id}" && deleted_at=""`;
      if (globalSearchTerm) {
        const term = globalSearchTerm.replace(/"/g, '\\"');
        filter += ` && (name~"${term}" || description~"${term}")`;
      }

      const result = await pb
        .collection("projects")
        .getList(currentPage + 1, ITEMS_PER_PAGE, {
          filter,
          sort: "-created",
        });

      return {
        data: mapRecords<MyProjectData>(result.items).map((p) => ({
          ...p,
          updated_at: (p as any).updated,
        })),
        count: result.totalItems,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  const totalCount = projects.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(0);
  }, [globalSearchTerm]);

  return {
    myProjects: projects.data,
    isLoadingMyProjects: isLoading,
    myProjectsError: error,
    myProjectsCurrentPage: currentPage,
    setMyProjectsCurrentPage: setCurrentPage,
    totalMyProjectsPages: totalPages,
    totalMyProjectsCount: totalCount,
    itemsPerPage: ITEMS_PER_PAGE,
  };
}
