import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflineSupabase } from "./useOfflineSupabase";
import { CrudOperation } from "@/lib/supabase-utils";
import { mapRecord } from "@/lib/pb-mapper";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  company_name: string | null;
  company_website: string | null;
  notification_prefs: Record<string, boolean> | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  updated_at?: string;
}

export function useProfile() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflineSupabase();

  const queryKey = ["profile", user?.id];

  const profileQuery = useQuery<Profile | null>({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return null;
      const record = await pb.collection("users").getOne(user.id);
      return mapRecord<Profile>(record);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const optimisticUpdater = (
    old: Profile | null | undefined,
    variables: Partial<Profile> & { id: string },
    operation: CrudOperation,
  ): Profile | null | undefined => {
    if (operation === "UPDATE") {
      return {
        ...old,
        ...variables,
        updated_at: new Date().toISOString(),
      } as Profile | null | undefined;
    }
    return old;
  };

  const updateProfileMutation = useOfflineMutation<
    Partial<Profile> & { id: string },
    Profile | null
  >({
    queryKey,
    table: "users",
    operation: "UPDATE",
    optimisticUpdater: optimisticUpdater,
    disableOfflineQueue: true,
    onSuccess: () => {
      toast.success(t("success"));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: any) => {
      toast.error(t("error") + ": " + error.message);
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation,
  };
}
