import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useSoftDeleteProject() {
  const { t } = useTranslation(["project_detail", "common"]);
  const queryClient = useQueryClient();

  const softDeleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await pb.collection("projects").update(projectId, {
        deleted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success(t("project_detail:successDeleted"));
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
