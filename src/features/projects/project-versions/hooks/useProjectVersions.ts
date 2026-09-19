import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { callRouteWithParams } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { handleError } from "@/shared/lib/toast";

export interface ProjectVersion {
  id: string;
  name: string;
  created_at: string;
  is_final: boolean;
  created_by_user_id?: string;
  author_name?: string;
  data?: any;
}

export function useProjectVersions(projectId: string) {
  const { t } = useTranslation(["project_versions", "common"]);
  const queryClient = useQueryClient();
  const { useMutation: useOfflineMutation } = useOfflinePb();

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
        fields: "id,name,created,is_final,created_by_user_id,data",
        expand: "created_by_user_id",
      });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        created_at: r.created,
        is_final: !!r.is_final,
        created_by_user_id: r.created_by_user_id,
        author_name:
          r.expand?.created_by_user_id?.name ||
          r.expand?.created_by_user_id?.email ||
          undefined,
        data: r.data,
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

  // Snapshot creation is server-side (JSVM route), so it runs online-only
  // against /api/projects/:id/versions directly — no offline queue.
  const createVersionMutation = useMutation<void, any, { name: string }>({
    mutationFn: async ({ name }) => {
      await callRouteWithParams("projects/versions", { id: projectId }, { name });
    },
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

  // Finalize is a JSVM route (online-only, like create). Optimistically mark
  // the version as final so the timeline reflects the lock immediately.
  const finalizeVersionMutation = useMutation<void, any, { id: string }>({
    mutationFn: async ({ id }) => {
      await callRouteWithParams("versions/finalize", { id });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectVersion[]>(queryKey);
      queryClient.setQueryData<ProjectVersion[]>(queryKey, (old) =>
        (old ?? []).map((v) => (v.id === id ? { ...v, is_final: true } : v)),
      );
      return { previous };
    },
    onError: (err: any, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      handleError(err);
    },
    onSuccess: () => {
      toast.success(t("success_finalized"));
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    versions,
    isLoadingVersions,
    fetchVersionSnapshot,
    createVersion: createVersionMutation.mutateAsync,
    isCreatingVersion: createVersionMutation.isPending,
    deleteVersion: deleteVersionMutation.mutateAsync,
    isDeletingVersion: deleteVersionMutation.isPending,
    finalizeVersion: finalizeVersionMutation.mutateAsync,
    isFinalizingVersion: finalizeVersionMutation.isPending,
  };
}
