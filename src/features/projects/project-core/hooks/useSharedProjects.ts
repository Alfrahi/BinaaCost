import { useState, useEffect } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { useAuth } from "@/features/auth";
import { fetchMinimalUsers } from "@/integrations/pocketbase/users";

const ITEMS_PER_PAGE = 10;

interface SharedProjectData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  owner_email?: string;
  shared_role?: string;
  financial_settings: Record<string, number> | null;
  currency: string;
}

interface SharedProjectsResponse {
  data: SharedProjectData[];
  count: number;
}

export function useSharedProjects(globalSearchTerm: string) {
  const { user } = useAuth();
  const { useQuery } = useOfflinePb();

  const [currentPage, setCurrentPage] = useState(0);

  const queryKey = ["sharedProjects", currentPage, globalSearchTerm, user?.id];

  const {
    data: projects = { data: [], count: 0 },
    isLoading,
    error,
  } = useQuery<SharedProjectsResponse>({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };

      let filter = `shared_with_user_id="${user.id}" && project_id.deleted_at=""`;
      if (globalSearchTerm) {
        const term = globalSearchTerm.replace(/"/g, '\\"');
        filter += ` && (project_id.name~"${term}" || project_id.description~"${term}")`;
      }

      const result = await pb
        .collection("project_shares")
        .getList(currentPage + 1, ITEMS_PER_PAGE, {
          filter,
          sort: "-created",
          expand: "project_id",
        });

      const projects = (result.items as any[])
        .map((share) => ({ share, project: share.expand?.project_id }))
        .filter((x) => x.project);
      const owners = await fetchMinimalUsers(
        projects.map((x) => x.project.user_id),
      );

      const formattedData: SharedProjectData[] = [];
      for (const { share, project } of projects) {
        formattedData.push({
          id: project.id,
          name: project.name,
          description: project.description,
          created_at: project.created,
          updated_at: project.updated,
          user_id: project.user_id,
          owner_email: owners.get(project.user_id)?.email,
          shared_role: share.role,
          financial_settings: project.financial_settings,
          currency: project.currency,
        });
      }

      return {
        data: formattedData,
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
    sharedProjects: projects.data,
    isLoadingSharedProjects: isLoading,
    sharedProjectsError: error,
    sharedProjectsCurrentPage: currentPage,
    setSharedProjectsCurrentPage: setCurrentPage,
    totalSharedProjectsPages: totalPages,
    totalSharedProjectsCount: totalCount,
    itemsPerPage: ITEMS_PER_PAGE,
  };
}
