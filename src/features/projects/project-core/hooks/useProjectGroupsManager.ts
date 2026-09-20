import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { arrayMove } from "@dnd-kit/sortable";
import { DragEndEvent } from "@dnd-kit/core";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { handleError } from "@/shared/lib/toast";

import type { ProjectGroup } from "@/features/projects/project-core/types/project";
export type { ProjectGroup };

export function useProjectGroupsManager(
  projectId: string,
  initialGroups: ProjectGroup[],
) {
  const { t } = useTranslation(["common", "project_detail"]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["project_groups", projectId];

  const { data: groups = initialGroups } = useQuery<ProjectGroup[]>({
    queryKey,
    queryFn: async () => {
      const records = await pb
        .collection("project_groups")
        .getFullList({ filter: `project_id="${projectId}"`, sort: "sort_order" });
      return mapRecords<ProjectGroup>(records);
    },
    initialData: initialGroups?.length ? initialGroups : undefined,
    staleTime: 1000 * 60,
  });

  const setGroups = useCallback(
    (updater: ProjectGroup[] | ((prev: ProjectGroup[]) => ProjectGroup[])) => {
      queryClient.setQueryData<ProjectGroup[]>(queryKey, (old) => {
        const prev = old ?? groups;
        return typeof updater === "function" ? updater(prev) : updater;
      });
    },
    [groups, queryClient, queryKey],
  );

  const optimisticSingleUpdater = useCallback(
    (old: ProjectGroup[] | undefined, variables: any, operation: string) => {
      const oldData = old ?? [];
      if (operation === "INSERT") {
        return [
          ...oldData,
          {
            ...variables,
            id: variables.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
      if (operation === "UPDATE") {
        return oldData.map((group) =>
          group.id === variables.id
            ? {
                ...group,
                ...variables,
                updated_at: new Date().toISOString(),
              }
            : group,
        );
      }
      if (operation === "DELETE") {
        return oldData.filter((group) => group.id !== variables.id);
      }
      return oldData;
    },
    [],
  );

  const addGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      await pb.collection("project_groups").create({
        project_id: projectId,
        user_id: user?.id,
        name: sanitizeText(name),
        sort_order: groups.length,
      });
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGroups = queryClient.getQueryData<ProjectGroup[]>(queryKey);
      queryClient.setQueryData<ProjectGroup[]>(queryKey, (old) =>
        optimisticSingleUpdater(
          old,
          {
            name: sanitizeText(name),
            project_id: projectId,
            user_id: user?.id,
            sort_order: old?.length || 0,
          },
          "INSERT",
        ),
      );
      return { previousGroups };
    },
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any, _variables, context: any) => {
      handleError(e);
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKey, context.previousGroups);
      }
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (group: ProjectGroup) => {
      await pb.collection("project_groups").update(group.id, {
        name: sanitizeText(group.name),
      });
    },
    onMutate: async (group) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGroups = queryClient.getQueryData<ProjectGroup[]>(queryKey);
      queryClient.setQueryData<ProjectGroup[]>(queryKey, (old) =>
        optimisticSingleUpdater(
          old,
          { ...group, name: sanitizeText(group.name) },
          "UPDATE",
        ),
      );
      return { previousGroups };
    },
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any, _variables, context: any) => {
      handleError(e);
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKey, context.previousGroups);
      }
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await pb.collection("project_groups").delete(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGroups = queryClient.getQueryData<ProjectGroup[]>(queryKey);
      queryClient.setQueryData<ProjectGroup[]>(queryKey, (old) =>
        optimisticSingleUpdater(old, { id }, "DELETE"),
      );
      return { previousGroups };
    },
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any, _variables, context: any) => {
      handleError(e);
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKey, context.previousGroups);
      }
    },
  });

  const reorderGroupsMutation = useMutation({
    mutationFn: async (newGroups: ProjectGroup[]) => {
      const updates = newGroups
        .map((g, index) => ({ id: g.id, sort_order: index, changed: g.sort_order !== index }))
        .filter((u) => u.changed);

      await Promise.all(
        updates.map((u) =>
          pb.collection("project_groups").update(u.id, { sort_order: u.sort_order }),
        ),
      );
    },
    onMutate: async (newGroups) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGroups = queryClient.getQueryData<ProjectGroup[]>(queryKey);
      queryClient.setQueryData<ProjectGroup[]>(queryKey, newGroups);
      return { previousGroups };
    },
    onSuccess: () => {
      toast.success(t("common:success"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any, _variables, context: any) => {
      handleError(e);
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKey, context.previousGroups);
      }
    },
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const currentGroups =
          queryClient.getQueryData<ProjectGroup[]>(queryKey) || groups;
        const oldIndex = currentGroups.findIndex((g) => g.id === active.id);
        const newIndex = currentGroups.findIndex((g) => g.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const newOrderedGroups = arrayMove(currentGroups, oldIndex, newIndex);
        reorderGroupsMutation.mutate(newOrderedGroups);
      }
    },
    [groups, queryClient, queryKey, reorderGroupsMutation],
  );

  return {
    groups,
    setGroups,
    addGroup: addGroupMutation.mutate,
    updateGroup: updateGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
    handleDragEnd,
    isAddingGroup: addGroupMutation.isPending,
    isUpdatingGroup: updateGroupMutation.isPending,
    isDeletingGroup: deleteGroupMutation.isPending,
    isReorderingGroups: reorderGroupsMutation.isPending,
  };
}
