import { useState, useEffect, useMemo } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 10;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  size: string | null;
  location: string | null;
  client_requirements: string | null;
  duration_days: number | null;
  deleted_at: string | null;
  user_id: string;
  owner_email: string;
}

export function useAdminProjectManagement() {
  const { t } = useTranslation(["admin", "common"]);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState("active");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(0);
  }, [search, activeTab]);

  const queryKey = ["admin_projects", currentPage, search, activeTab];

  const {
    data: projectData = { items: [], totalItems: 0 },
    isLoading,
    error,
  } = useQuery<{ items: Project[]; totalItems: number }>({
    queryKey,
    queryFn: async () => {
      const parts: string[] = [];
      if (activeTab === "active") {
        parts.push('deleted_at = ""');
      } else {
        parts.push('deleted_at != ""');
      }
      if (search.trim()) {
        const s = search.trim().replace(/"/g, '\\"');
        parts.push(
          `(name ~ "${s}" || description ~ "${s}" || location ~ "${s}")`,
        );
      }
      const result = await pb.collection("projects").getList(currentPage + 1, PAGE_SIZE, {
        filter: parts.join(" && "),
        sort: "-created",
        expand: "user_id",
        fields: "*, expand.user_id.email",
      });
      const rows = mapRecords(result.items) as any[];
      const items = rows.map((r) => ({
        ...r,
        owner_email: r.expand?.user_id?.email ?? "",
      })) as Project[];
      return {
        items,
        totalItems: result.totalItems,
      };
    },
    placeholderData: (previousData) => previousData || { items: [], totalItems: 0 },
    staleTime: 1000 * 60,
  });

  const projects = projectData.items;

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      // super_admin may delete any project via rules; cascades to children
      await pb.collection("projects").delete(projectId);
    },
    onMutate: async (projectId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<{
        items: Project[];
        totalItems: number;
      }>(queryKey);
      if (previousData) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          items: previousData.items.filter((p) => p.id !== projectId),
          totalItems: Math.max(0, previousData.totalItems - 1),
        });
      }
      return { previousData };
    },
    onError: (error: Error, _projectId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      void toast.error(
        t("admin:projects.errorDelete", { message: error.message }),
      );
    },
    onSuccess: () => {
      void toast.success(t("admin:projects.successDeleted"));
      queryClient.invalidateQueries({ queryKey: ["admin_projects"] });
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
  });

  const handleError = (error: any) => {
    void toast.error(error?.message || "An error occurred");
  };

  const restoreProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const p = await pb.collection("projects").getOne(projectId);
      await pb.collection("projects").update(projectId, { deleted_at: null, version: p.version });
    },
    onSuccess: () => {
      void toast.success(t("admin:projects.successRestored"));
      queryClient.invalidateQueries({ queryKey: ["admin_projects"] });
    },
    onError: (e: any) => {
      handleError(e);
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async ({
      projectId,
      newUserId,
    }: {
      projectId: string;
      newUserId: string;
    }) => {
      const p = await pb.collection("projects").getOne(projectId);
      await pb.collection("projects").update(projectId, { user_id: newUserId, version: p.version });
    },
    onSuccess: (_data, variables) => {
      void toast.success(t("admin:projects.successOwnershipTransferred"));
      void queryClient.invalidateQueries({ queryKey: ["admin_projects"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (variables?.projectId) {
        void queryClient.invalidateQueries({ queryKey: ["project", variables.projectId] });
        void queryClient.invalidateQueries({ queryKey: ["project_groups", variables.projectId] });
        void queryClient.invalidateQueries({ queryKey: ["materials", variables.projectId] });
        void queryClient.invalidateQueries({ queryKey: ["labor_items", variables.projectId] });
        void queryClient.invalidateQueries({ queryKey: ["equipment_items", variables.projectId] });
        void queryClient.invalidateQueries({ queryKey: ["additional_costs", variables.projectId] });
        void queryClient.invalidateQueries({ queryKey: ["risks", variables.projectId] });
        void queryClient.invalidateQueries({ queryKey: ["project_versions", variables.projectId] });
      }
    },
    onError: (error: Error) => {
      void toast.error(
        t("admin:projects.errorOwnershipTransfer", { message: error.message }),
      );
    },
  });

  const handleDelete = (project: Project) => {
    setDeleteTarget(project);
    setIsDeleteDialogOpen(true);
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((projectData.totalItems || 0) / PAGE_SIZE)),
    [projectData.totalItems],
  );

  return {
    projects,
    isLoading,
    error,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    activeTab,
    setActiveTab,
    deleteTarget,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleDelete,
    deleteProjectMutation,
    restoreProjectMutation,
    transferOwnershipMutation,
    totalPages,
    PAGE_SIZE,
  };
}
