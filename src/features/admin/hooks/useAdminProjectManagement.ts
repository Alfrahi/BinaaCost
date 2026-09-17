import { useState, useEffect, useMemo } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/shared/lib/pb-mapper";
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
    data: projects = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
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
      return rows.map((r) => ({
        ...r,
        owner_email: r.expand?.user_id?.email ?? "",
      })) as Project[];
    },
    placeholderData: (previousData) => previousData || [],
    staleTime: 1000 * 60,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      // super_admin may delete any project via rules; cascades to children
      await pb.collection("projects").delete(projectId);
    },
    onSuccess: () => {
      void toast.success(t("admin:projects.successDeleted"));
      queryClient.invalidateQueries({ queryKey: ["admin_projects"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      void toast.error(
        t("admin:projects.errorDelete", { message: error.message }),
      );
    },
  });

  const handleDelete = (project: Project) => {
    setDeleteTarget(project);
    setIsDeleteDialogOpen(true);
  };

  const totalPages = useMemo(
    () => Math.ceil((projects?.length ?? 0) / PAGE_SIZE) ?? 1,
    [projects],
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
    totalPages,
    PAGE_SIZE,
  };
}
