import { useMemo } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecord, mapRecords } from "@/shared/lib/pb-mapper";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";
import { useAuth } from "@/features/auth";
import type { ProjectGroup } from "@/features/projects/project-core/types/project";

const listByProject = (table: string, projectId: string, sort?: string) => () =>
  pb
    .collection(table)
    .getFullList({
      filter: `project_id="${projectId}"`,
      ...(sort ? { sort } : {}),
    })
    .then((records) => mapRecords(records));

/**
 * Core project hook — fetches the project record, access control,
 * dropdown settings, and project groups.
 *
 * Cost line items (materials, labor, equipment, additional, risks) are
 * fetched by their dedicated entity hooks. Do NOT add cost data here.
 */
export function useProjectData(projectId?: string) {
  const { user, role: userRole, loading: authLoading } = useAuth();
  const { useQuery } = useOfflinePb();

  const { options: sizeUnits, isLoading: loadingSizeUnits } =
    useSettingsOptions("project_size_unit");
  const { options: projectTypes, isLoading: loadingProjectTypes } =
    useSettingsOptions("project_type");

  const queryOptions = {
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  };

  const {
    data: project,
    isLoading: loadingProject,
    error: projectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const record = await pb.collection("projects").getOne(projectId!);
      return mapRecord(record);
    },
    ...queryOptions,
  });

  const isOwner = !!project && project.user_id === user?.id;

  const { data: projectShare, isLoading: loadingProjectShare } = useQuery<{
    role: string;
  } | null>({
    queryKey: ["project_share_role", projectId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const record = await pb
          .collection("project_shares")
          .getFirstListItem(
            `project_id="${projectId}" && shared_with_user_id="${user.id}"`,
          );
        return { role: record.role as string };
      } catch (err: any) {
        if (err?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!projectId && !!user?.id && !isOwner,
    staleTime: 1000 * 60 * 2,
  });

  const canEdit = useMemo(() => {
    if (authLoading) return false;
    if (userRole === "super_admin") return true;
    if (isOwner) return true;
    if (projectShare?.role === "editor") return true;
    return false;
  }, [authLoading, userRole, isOwner, projectShare?.role]);

  const accessLevel = useMemo(() => {
    if (authLoading) return "loading";
    if (userRole === "super_admin") return "super_admin";
    if (isOwner) return "owner";
    if (projectShare?.role === "editor") return "editor";
    if (projectShare?.role === "viewer") return "viewer";
    return "none";
  }, [authLoading, userRole, isOwner, projectShare?.role]);

  const groupsQuery = useQuery({
    queryKey: ["project_groups", projectId],
    queryFn: listByProject("project_groups", projectId!, "sort_order,created"),
    ...queryOptions,
  });

  const groups = useMemo(
    () => (groupsQuery.data ?? []) as unknown as ProjectGroup[],
    [groupsQuery.data],
  );

  const isLoading =
    authLoading ||
    loadingProject ||
    loadingSizeUnits ||
    loadingProjectTypes ||
    groupsQuery.isLoading ||
    loadingProjectShare;

  return {
    project,
    user,
    isOwner,
    accessLevel,
    canEdit,
    sizeUnits,
    projectTypes,
    groups,
    isLoading,
    error: projectError,
  };
}
