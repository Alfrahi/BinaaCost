import { useState, useEffect, useMemo } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { callRouteWithParams } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleError } from "@/shared/lib/toast";

const PAGE_SIZE = 10;

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

interface DeleteUserResponse {
  error?: string;
  message?: string;
}

export function useAdminUserManagement() {
  const { t } = useTranslation(["admin", "common", "roles"]);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // RPC fallback listing dropped in PB migration — keep flag for consumers
  const showFallbackWarning = false;

  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  const queryKey = ["admin_users"];

  const {
    data: allUsersData = [],
    isLoading,
    error,
  } = useQuery<UserProfile[]>({
    queryKey,
    queryFn: async (): Promise<UserProfile[]> => {
      // super_admin list rules allow fetching all users
      const records = await pb.collection("users").getFullList({ sort: "created" });
      return records.map((r) => ({
        id: r.id,
        email: r.email as string,
        first_name: (r.first_name as string) ?? null,
        last_name: (r.last_name as string) ?? null,
        role: (r.role as string) ?? "user",
        created_at: r.created,
      }));
    },
    placeholderData: (previousData) => previousData ?? [],
    staleTime: 1000 * 60,
  });

  const filteredUsers = useMemo(() => {
    let filteredData = allUsersData || [];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filteredData = filteredData.filter(
        (user: UserProfile) =>
          user.email.toLowerCase().includes(s) ||
          user.first_name?.toLowerCase().includes(s) ||
          user.last_name?.toLowerCase().includes(s),
      );
    }
    return filteredData;
  }, [allUsersData, search]);

  const paginatedUsers = useMemo(() => {
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE;
    return filteredUsers.slice(from, to);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error]);

  const updateUserMutation = useMutation({
    mutationFn: async ({
      user_id,
      first_name,
      last_name,
      email,
      role,
      password,
    }: {
      user_id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      role?: string;
      password?: string;
    }) => {
      await callRouteWithParams(
        "admin/users/update",
        { id: user_id },
        {
          first_name,
          last_name,
          email,
          role,
          password: password || undefined,
        },
      );
    },
    onSuccess: () => {
      void toast.success(t("admin:users.successUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_user"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_user_details"] });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      handleError(error);
    },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      await pb.collection("users").requestPasswordReset(email);
    },
    onSuccess: () => {
      void toast.success(t("admin:users.successPasswordResetSent"));
    },
    onError: (error: Error) => {
      handleError(error);
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({
      user_id_to_update,
      new_role,
    }: {
      user_id_to_update: string;
      new_role: string;
    }) => {
      await callRouteWithParams(
        "admin/users/role",
        { id: user_id_to_update },
        { role: new_role },
      );
    },
    onSuccess: () => {
      void toast.success(t("admin:users.successRoleUpdate"));
      void queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_user"] });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      handleError(error);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return callRouteWithParams<DeleteUserResponse>(
        "admin/users/delete",
        { id: userId },
        {},
      );
    },
    onSuccess: () => {
      void toast.success(t("admin:users.successDeleted"));
      void queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      handleError(error);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      first_name,
      last_name,
      role,
    }: {
      email: string;
      password: string;
      first_name?: string;
      last_name?: string;
      role: string;
    }) => {
      await pb.collection("users").create({
        email,
        password,
        passwordConfirm: password,
        first_name: first_name || "",
        last_name: last_name || "",
        role: role || "user",
        emailVisibility: true,
      });
    },
    onSuccess: () => {
      void toast.success(t("admin:users.successCreated"));
      void queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (error: Error) => {
      handleError(error);
    },
  });

  const handleDelete = (userId: string) => {
    setDeleteTarget(userId);
    setIsDeleteDialogOpen(true);
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE)),
    [filteredUsers.length],
  );

  return {
    users: paginatedUsers,
    isLoading,
    error,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    editingUser,
    setEditingUser,
    deleteTarget,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    showFallbackWarning,
    createUserMutation,
    updateUserMutation,
    updateUserRoleMutation,
    sendPasswordResetMutation,
    deleteUserMutation,
    handleDelete,
    totalPages,
    PAGE_SIZE,
  };
}
