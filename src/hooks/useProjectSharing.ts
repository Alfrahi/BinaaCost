import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import {
  callRoute,
  callRouteWithParams,
} from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/utils/toast";
import { fetchMinimalUsers } from "@/lib/usersMinimal";

export interface ProjectShare {
  share_id: string;
  shared_with_user_id: string;
  role: "viewer" | "editor";
  email: string;
}

export interface ExternalShareLink {
  id: string;
  expires_at: string;
  created_by_user_id: string;
}

export function useProjectSharing(projectId: string) {
  const { t } = useTranslation(["project_detail", "common", "roles"]);
  const queryClient = useQueryClient();

  const internalShareQueryKey = ["project_shares", projectId];
  const externalShareQueryKey = ["external_share_links", projectId];

  const { data: internalShares = [], isLoading: isLoadingInternalShares } =
    useQuery<ProjectShare[]>({
      queryKey: internalShareQueryKey,
      queryFn: async () => {
        const records = await pb.collection("project_shares").getFullList({
          filter: `project_id="${projectId}"`,
        });
        const users = await fetchMinimalUsers(
          records.map((r) => r.shared_with_user_id),
        );
        return records.map((r) => ({
          share_id: r.id,
          shared_with_user_id: r.shared_with_user_id,
          role: r.role as "viewer" | "editor",
          email:
            users.get(r.shared_with_user_id)?.email ??
            r.shared_with_email ??
            "",
        }));
      },
      enabled: !!projectId,
    });

  const { data: externalLinks = [], isLoading: isLoadingExternalLinks } =
    useQuery<ExternalShareLink[]>({
      queryKey: externalShareQueryKey,
      queryFn: async () => {
        // tokens are hashed — listing cannot expose them; metadata only
        const records = await pb.collection("shared_project_links").getFullList({
          filter: `project_id="${projectId}"`,
          fields: "id,expires_at,created_by_user_id,created",
        });
        return records.map((r) => ({
          id: r.id,
          expires_at: r.expires_at,
          created_by_user_id: r.created_by_user_id,
        }));
      },
      enabled: !!projectId,
    });

  const addInternalShareMutation = useMutation({
    mutationFn: async (variables: {
      email: string;
      role: "viewer" | "editor";
    }) => {
      const { id } = await callRoute<{ id: string }>("users/resolve", {
        email: variables.email,
      });
      if (id === pb.authStore.record?.id) {
        throw new Error("Cannot share own project with yourself");
      }
      await pb.collection("project_shares").create({
        project_id: projectId,
        shared_with_user_id: id,
        shared_with_email: variables.email,
        role: variables.role,
      });
    },
    onSuccess: () => {
      toast.success(t("project_detail:share.successAdded"));
      queryClient.invalidateQueries({ queryKey: internalShareQueryKey });
      queryClient.invalidateQueries({ queryKey: ["sharedProjects"] });
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  const updateInternalShareMutation = useMutation({
    mutationFn: async (variables: {
      shareId: string;
      newRole: "viewer" | "editor";
    }) => {
      await pb
        .collection("project_shares")
        .update(variables.shareId, { role: variables.newRole });
    },
    onSuccess: () => {
      toast.success(t("project_detail:share.successUpdated"));
      queryClient.invalidateQueries({ queryKey: internalShareQueryKey });
      queryClient.invalidateQueries({ queryKey: ["sharedProjects"] });
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  const deleteInternalShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      await pb.collection("project_shares").delete(shareId);
    },
    onSuccess: () => {
      toast.success(t("project_detail:share.successDeleted"));
      queryClient.invalidateQueries({ queryKey: internalShareQueryKey });
      queryClient.invalidateQueries({ queryKey: ["sharedProjects"] });
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  const generateExternalLinkMutation = useMutation({
    mutationFn: async (variables: { expiresAt: string; password?: string }) => {
      const data = await callRouteWithParams<{ access_token: string }>(
        "projects/share-links",
        { id: projectId },
        { expires_at: variables.expiresAt, password: variables.password },
      );
      return data.access_token;
    },
    onSuccess: () => {
      toast.success(t("project_detail:share.external.successGenerated"));
      queryClient.invalidateQueries({ queryKey: externalShareQueryKey });
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  const deleteExternalLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await pb.collection("shared_project_links").delete(linkId);
    },
    onSuccess: () => {
      toast.success(t("project_detail:share.external.successDeleted"));
      queryClient.invalidateQueries({ queryKey: externalShareQueryKey });
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  return {
    internalShares,
    externalLinks,

    isLoadingInternalShares,
    isLoadingExternalLinks,
    isAddingInternalShare: addInternalShareMutation.isPending,
    isUpdatingInternalShare: updateInternalShareMutation.isPending,
    isDeletingInternalShare: deleteInternalShareMutation.isPending,
    isGeneratingExternalLink: generateExternalLinkMutation.isPending,
    isDeletingExternalLink: deleteExternalLinkMutation.isPending,

    addInternalShare: addInternalShareMutation.mutateAsync,
    updateInternalShare: updateInternalShareMutation.mutateAsync,
    deleteInternalShare: deleteInternalShareMutation.mutateAsync,
    generateExternalLink: generateExternalLinkMutation.mutateAsync,
    deleteExternalLink: deleteExternalLinkMutation.mutateAsync,
  };
}
