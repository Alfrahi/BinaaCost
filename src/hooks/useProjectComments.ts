import { useState, useMemo } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { useAuth } from "@/components/AuthProvider";
import { useOfflinePb } from "./useOfflinePb";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
  Risk,
} from "@/types/project-items";
import { sanitizeText } from "@/utils/sanitizeText";
import { handleError } from "@/utils/toast";
import { fetchMinimalUsers } from "@/lib/usersMinimal";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  project_id: string;
  item_id: string;
  item_type: string;
  profiles?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

type CommentableItem =
  | MaterialItem
  | LaborItem
  | EquipmentItem
  | AdditionalCostItem
  | Risk;

export function useProjectComments(projectId: string) {
  const { user } = useAuth();
  const { useMutation: useOfflineMutation, useQuery: useOfflineQuery } =
    useOfflinePb();

  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [selectedCommentItem, setSelectedCommentItem] =
    useState<CommentableItem | null>(null);
  const [selectedCommentItemType, setSelectedCommentItemType] = useState<
    string | null
  >(null);

  const commentsQueryKey = ["comments", projectId];

  const { data: allComments = [], isLoading: isLoadingComments } =
    useOfflineQuery<Comment[]>({
      queryKey: commentsQueryKey,
      queryFn: async () => {
        if (!projectId) return [];
        const records = await pb.collection("comments").getFullList({
          filter: `project_id="${projectId}"`,
          sort: "created",
        });
        const users = await fetchMinimalUsers(records.map((r) => r.user_id));
        return records.map((r) => {
          const author = users.get(r.user_id);
          return {
            ...(r as any),
            created_at: r.created,
            updated_at: r.updated,
            profiles: author
              ? {
                  email: author.email,
                  first_name: author.first_name,
                  last_name: author.last_name,
                }
              : undefined,
          } as Comment;
        });
      },
      enabled: !!projectId,
      staleTime: 1000 * 10,
    });

  const handleOpenComments = (item: CommentableItem, itemType: string) => {
    setSelectedCommentItem(item);
    setSelectedCommentItemType(itemType);
    setCommentsDrawerOpen(true);
  };

  const optimisticSingleUpdater = (
    old: Comment[] | undefined,
    variables: any,
    operation: string,
  ) => {
    const oldData = old ?? [];
    if (operation === "INSERT") {
      return [
        ...oldData,
        {
          ...variables,
          id: variables.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          profiles: {
            email: user?.email,
            first_name: user?.first_name,
            last_name: user?.last_name,
          },
        },
      ];
    }
    if (operation === "UPDATE") {
      return oldData.map((comment) =>
        comment.id === variables.id ? { ...comment, ...variables } : comment,
      );
    }
    if (operation === "DELETE") {
      return oldData.filter((comment) => comment.id !== variables.id);
    }
    return oldData;
  };

  const { mutateAsync: addCommentMutation, isPending: isAdding } =
    useOfflineMutation<any, Comment[]>({
      queryKey: commentsQueryKey,
      table: "comments",
      operation: "INSERT",
      optimisticUpdater: optimisticSingleUpdater,
      disableOfflineQueue: true,
      onSuccess: () => {},
      onError: (e: any) => {
        handleError(e);
      },
    });

  const { mutateAsync: updateCommentMutation, isPending: isUpdating } =
    useOfflineMutation<any, Comment[]>({
      queryKey: commentsQueryKey,
      table: "comments",
      operation: "UPDATE",
      optimisticUpdater: optimisticSingleUpdater,
      disableOfflineQueue: true,
      onSuccess: () => {},
      onError: (e: any) => {
        handleError(e);
      },
    });

  const { mutateAsync: deleteCommentMutation, isPending: isDeleting } =
    useOfflineMutation<any, Comment[]>({
      queryKey: commentsQueryKey,
      table: "comments",
      operation: "DELETE",
      optimisticUpdater: optimisticSingleUpdater,
      disableOfflineQueue: true,
      onSuccess: () => {},
      onError: (e: any) => {
        handleError(e);
      },
    });

  const handleAddComment = async (content: string) => {
    if (!user || !selectedCommentItem || !selectedCommentItemType) return;
    await addCommentMutation({
      id: crypto.randomUUID(),
      project_id: projectId,
      item_id: selectedCommentItem.id,
      item_type: selectedCommentItemType,
      user_id: user.id,
      content: sanitizeText(content),
    });
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!user || !selectedCommentItem || !selectedCommentItemType) return;
    await updateCommentMutation({
      id: commentId,
      content: sanitizeText(content),
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !selectedCommentItem || !selectedCommentItemType) return;
    await deleteCommentMutation({
      id: commentId,
    });
  };

  const itemComments = useMemo(() => {
    if (!selectedCommentItem) return [];
    return (
      (allComments || []).filter(
        (comment: Comment) => comment.item_id === selectedCommentItem.id,
      ) || []
    );
  }, [allComments, selectedCommentItem]);

  const isAnyCommentMutationLoading = isAdding || isUpdating || isDeleting;

  return {
    comments: allComments,
    itemComments: itemComments,
    commentsDrawerOpen,
    setCommentsDrawerOpen,
    selectedCommentItem,
    selectedCommentItemType,
    handleOpenComments,
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    currentUserId: user?.id,
    isAdding,
    isUpdating,
    isDeleting,
    isAnyCommentMutationLoading,
    isLoadingComments,
  };
}
