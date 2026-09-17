"use client";

import { useMemo } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecord, mapRecords } from "@/shared/lib/pb-mapper";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { useSettingsOptions } from "@/features/admin/hooks/useSettingsOptions";
import { useAuth } from "@/app/providers/AuthProvider";
import { calculateCategoryTotal } from "@/shared/logic/shared";
import type { ProjectGroup } from "@/types/project";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
  Risk,
} from "@/types/project-items";

const listByProject = (table: string, projectId: string, sort?: string) => () =>
  pb
    .collection(table)
    .getFullList({
      filter: `project_id="${projectId}"`,
      ...(sort ? { sort } : {}),
    })
    .then((records) => mapRecords(records));

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

  const materialsQuery = useQuery({
    queryKey: ["materials", projectId],
    queryFn: listByProject("materials", projectId!),
    ...queryOptions,
  });

  const laborQuery = useQuery({
    queryKey: ["labor_items", projectId],
    queryFn: listByProject("labor_items", projectId!),
    ...queryOptions,
  });

  const equipmentQuery = useQuery({
    queryKey: ["equipment_items", projectId],
    queryFn: listByProject("equipment_items", projectId!),
    ...queryOptions,
  });

  const additionalQuery = useQuery({
    queryKey: ["additional_costs", projectId],
    queryFn: listByProject("additional_costs", projectId!),
    ...queryOptions,
  });

  const risksQuery = useQuery({
    queryKey: ["risks", projectId],
    queryFn: listByProject("risks", projectId!),
    ...queryOptions,
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", projectId],
    queryFn: listByProject("comments", projectId!, "created"),
    ...queryOptions,
  });

  const groups = useMemo(
    () => (groupsQuery.data ?? []) as unknown as ProjectGroup[],
    [groupsQuery.data],
  );
  const materials = useMemo(
    () => materialsQuery.data ?? [],
    [materialsQuery.data],
  ) as MaterialItem[];
  const labor = useMemo(
    () => laborQuery.data ?? [],
    [laborQuery.data],
  ) as LaborItem[];
  const equipment = useMemo(
    () => equipmentQuery.data ?? [],
    [equipmentQuery.data],
  ) as EquipmentItem[];
  const additional = useMemo(
    () => additionalQuery.data ?? [],
    [additionalQuery.data],
  ) as AdditionalCostItem[];
  const risks = useMemo(
    () => risksQuery.data ?? [],
    [risksQuery.data],
  ) as Risk[];
  const comments = useMemo(
    () => commentsQuery.data ?? [],
    [commentsQuery.data],
  );

  const totals = useMemo(() => {
    const materialsTotal = calculateCategoryTotal.materials(materials);
    const laborTotal = calculateCategoryTotal.labor(labor);
    const equipmentTotal = calculateCategoryTotal.equipment(equipment);
    const additionalTotal = calculateCategoryTotal.additional(additional);

    return {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      additionalTotal,
    };
  }, [materials, labor, equipment, additional]);

  const isLoading =
    authLoading ||
    loadingProject ||
    loadingSizeUnits ||
    loadingProjectTypes ||
    groupsQuery.isLoading ||
    materialsQuery.isLoading ||
    laborQuery.isLoading ||
    equipmentQuery.isLoading ||
    additionalQuery.isLoading ||
    risksQuery.isLoading ||
    commentsQuery.isLoading ||
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
    materials,
    labor,
    equipment,
    additional,
    risks,
    comments,
    totals,
    isLoading,
    error: projectError,
  };
}
