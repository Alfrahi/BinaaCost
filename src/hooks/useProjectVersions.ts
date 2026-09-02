import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflineSupabase } from "./useOfflineSupabase";
import { handleError } from "@/utils/toast";

export interface ProjectVersion {
  id: string;
  name: string;
  created_at: string;
  data?: any;
}

export function useProjectVersions(projectId: string) {
  const { t } = useTranslation(["project_versions", "common"]);
  const queryClient = useQueryClient();
  const { useMutation: useOfflineMutation } = useOfflineSupabase();

  const queryKey = ["project_versions", projectId];

  const { data: versions = [], isLoading: isLoadingVersions } = useQuery<
    ProjectVersion[]
  >({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const records = await pb.collection("project_versions").getFullList({
        filter: `project_id="${projectId}"`,
        sort: "-created",
        fields: "id,name,created",
      });
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        created_at: r.created,
      }));
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  const fetchVersionSnapshot = async (
    versionId: string,
  ): Promise<any | null> => {
    if (!versionId) return null;
    const record = await pb.collection("project_versions").getOne(versionId);
    return record.data;
  };

  const optimisticDeleteUpdater = (
    old: ProjectVersion[] | undefined,
    variables: { id: string },
    operation: string,
  ) => {
    const oldData = old ?? [];
    if (operation === "DELETE") {
      return oldData.filter((version) => version.id !== variables.id);
    }
    return oldData;
  };

  const createVersionMutation = useOfflineMutation<
    { p_project_id: string; p_name: string },
    void
  >({
    queryKey,
    table: "project_versions", // queued replays hit the custom route below
    operation: "RPC",
    onSuccess: () => {
      toast.success(t("success_created"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => handleError(err),
  });

  const deleteVersionMutation = useOfflineMutation<{ id: string }, ProjectVersion[]>({
    queryKey,
    table: "project_versions",
    operation: "DELETE",
    optimisticUpdater: optimisticDeleteUpdater,
    onSuccess: () => {
      toast.success(t("success_deleted"));
    },
    onError: (err: any) => handleError(err),
  });

  return {
    versions,
    isLoadingVersions,
    fetchVersionSnapshot,
    createVersion: createVersionMutation.mutateAsync,
    isCreatingVersion: createVersionMutation.isPending,
    deleteVersion: deleteVersionMutation.mutateAsync,
    isDeletingVersion: deleteVersionMutation.isPending,
  };
}
