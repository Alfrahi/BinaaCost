import { useOfflinePb } from "@/hooks/useOfflinePb";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/lib/pb-mapper";
import { useState } from "react";

const PAGE_SIZE = 5;

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  size: string | null;
  location: string | null;
  deleted_at: string | null;
}

export function useAdminUserProjects(userId?: string, initialPage = 0) {
  const { useQuery: useOfflineQuery } = useOfflinePb();
  const [currentPage, setCurrentPage] = useState(initialPage);

  const queryKey = ["admin_user_projects", userId, currentPage];

  const {
    data: projects = [],
    isLoading,
    error,
  } = useOfflineQuery<Project[]>({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      const result = await pb.collection("projects").getList(
        currentPage + 1,
        PAGE_SIZE,
        { filter: `user_id="${userId}"`, sort: "-created" },
      );
      return mapRecords<Project>(result.items);
    },
    enabled: !!userId,
  });

  const { data: totalProjectsCount = 0 } = useOfflineQuery<number>({
    queryKey: ["admin_user_projects_count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const result = await pb.collection("projects").getList(1, 1, {
        filter: `user_id="${userId}"`,
      });
      return result.totalItems;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const totalPages = Math.ceil(totalProjectsCount / PAGE_SIZE) || 1;

  return {
    projects,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    PAGE_SIZE,
  };
}
