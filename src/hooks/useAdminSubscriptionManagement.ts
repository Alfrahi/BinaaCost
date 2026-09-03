import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { callRouteWithParams } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useRole } from "@/hooks/useRole";

const PAGE_SIZE = 10;

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  plan: string;
  subscription_expires_at: string | null;
  max_active_projects: number | null;
}

const PLANS = [
  { value: "free", labelKey: "admin:subscriptionManagement.planFree" },
  { value: "basic", labelKey: "admin:subscriptionManagement.planBasic" },
  { value: "pro", labelKey: "admin:subscriptionManagement.planPro" },
];

export function useAdminSubscriptionManagement() {
  const { t } = useTranslation(["admin", "common"]);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useRole();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string>("");
  const [editingExpiry, setEditingExpiry] = useState<string>("");

  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  const queryKey = ["admin_users_for_subscription"];

  const { data: allUsersData = [], isLoading } = useQuery<User[]>({
    queryKey,
    queryFn: async (): Promise<User[]> => {
      const records = await pb.collection("users").getFullList({ sort: "created" });
      return records.map((r) => ({
        id: r.id,
        email: r.email as string,
        first_name: (r.first_name as string) ?? "",
        last_name: (r.last_name as string) ?? "",
        role: (r.role as string) ?? "user",
        plan: (r.subscription_plan as string) ?? "",
        subscription_expires_at: (r.subscription_expires_at as string) ?? null,
        max_active_projects: null,
      }));
    },
    placeholderData: (previousData) => previousData || [],
  });

  const filteredUsers = useMemo(() => {
    let filtered = allUsersData;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(s) ||
          user.first_name?.toLowerCase().includes(s) ||
          user.last_name?.toLowerCase().includes(s),
      );
    }
    return filtered;
  }, [allUsersData, search]);

  const paginatedUsers = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage]);

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({
      userId,
      plan,
      expiresAt,
    }: {
      userId: string;
      plan: string;
      expiresAt: string | null;
    }) => {
      await callRouteWithParams(
        "admin/users/subscription",
        { id: userId },
        { plan, expires_at: expiresAt },
      );
    },
    onSuccess: () => {
      toast.success(t("admin:subscriptionManagement.successUpdated"));
      queryClient.invalidateQueries({
        queryKey: ["admin_users_for_subscription"],
      });
      setEditingUserId(null);
    },
    onError: (error: Error) => {
      toast.error(
        t("admin:subscriptionManagement.errorUpdate", {
          message: error.message,
        }),
      );
    },
  });

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditingPlan(user.plan);
    setEditingExpiry(user.subscription_expires_at ?? "");
  };

  const handleSave = () => {
    if (!editingUserId) return;

    const expiresAt = editingExpiry
      ? new Date(editingExpiry).toISOString()
      : null;

    void updateSubscriptionMutation.mutate({
      userId: editingUserId,
      plan: editingPlan,
      expiresAt,
    });
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setEditingPlan("");
    setEditingExpiry("");
  };

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  return {
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    editingUserId,
    editingPlan,
    setEditingPlan,
    editingExpiry,
    setEditingExpiry,
    paginatedUsers,
    isLoading,
    isSuperAdmin,
    handleEdit,
    handleSave,
    handleCancel,
    updateSubscriptionMutation,
    totalPages,
    PLANS,
  };
}
