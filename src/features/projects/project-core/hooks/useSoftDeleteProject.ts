import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useSoftDeleteProject() {
  const { t } = useTranslation(["project_detail", "common"]);
  const queryClient = useQueryClient();

  const softDeleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const cachedProject = queryClient.getQueryData<any>(["project", projectId]);
      await pb.collection("projects").update(projectId, {
        deleted_at: new Date().toISOString(),
        version: cachedProject?.version,
      });
    },
    onMutate: async (projectId: string) => {
      await queryClient.cancelQueries({ queryKey: ["myProjects"] });
      await queryClient.cancelQueries({ queryKey: ["sharedProjects"] });

      queryClient.setQueriesData({ queryKey: ["myProjects"] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.filter((p: any) => p.id !== projectId),
          count: Math.max(0, (old.count || 1) - 1),
        };
      });

      queryClient.setQueriesData({ queryKey: ["sharedProjects"] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.filter((p: any) => p.id !== projectId),
          count: Math.max(0, (old.count || 1) - 1),
        };
      });
    },
    onSuccess: () => {
      toast.success(t("project_detail:successDeleted"));
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      queryClient.invalidateQueries({ queryKey: ["sharedProjects"] });
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
    },
    onError: (error: any) => {
      toast.error(t("project_detail:errorDelete") + ": " + error.message);
    },
  });

  return softDeleteMutation;
}
