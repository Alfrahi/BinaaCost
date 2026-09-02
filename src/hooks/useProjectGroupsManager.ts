import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { arrayMove } from "@dnd-kit/sortable";
import { DragEndEvent } from "@dnd-kit/core";
import { sanitizeText } from "@/utils/sanitizeText";
import { handleError } from "@/utils/toast";

export interface ProjectGroup {
  id: string;
  name: string;
  sort_order: number;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useProjectGroupsManager(
  projectId: string,
  initialGroups: ProjectGroup[],
) {
  const { t } = useTranslation(["common", "project_detail"]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["project_groups", projectId];

  const [groups, setGroups] = useState<ProjectGroup[]>(initialGroups);

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

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
      for (const [index, g] of newGroups.entries()) {
        await pb
          .collection("project_groups")
          .update(g.id, { sort_order: index });
      }
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
        setGroups((currentGroups) => {
          const oldIndex = currentGroups.findIndex((g) => g.id === active.id);
          const newIndex = currentGroups.findIndex((g) => g.id === over.id);
          const newOrderedGroups = arrayMove(currentGroups, oldIndex, newIndex);
          reorderGroupsMutation.mutate(newOrderedGroups);
          return newOrderedGroups;
        });
      }
    },
    [reorderGroupsMutation],
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
