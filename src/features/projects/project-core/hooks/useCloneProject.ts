import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { pb } from "@/integrations/pocketbase/client";
import { useAuth } from "@/features/auth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/shared/lib/toast";

export interface CloneProjectOptions {
  projectId: string;
  customName?: string;
}

export function useCloneProject() {
  const { t } = useTranslation(["common", "dashboard", "project_detail"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, customName }: CloneProjectOptions) => {
      if (!user?.id) {
        throw new Error(t("common:mustBeLoggedIn"));
      }

      const copySuffix = t("common:copySuffix", { defaultValue: "Copy" });

      const response = await pb.send(`/api/projects/${projectId}/clone`, {
        method: "POST",
        body: {
          customName,
          copySuffix,
        },
      });

      return response;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("common:duplicateSuccess"));
      navigate(`/projects/${newProject.id}`);
    },
    onError: (err: any) => {
      handleError(err);
    },
  });
}
