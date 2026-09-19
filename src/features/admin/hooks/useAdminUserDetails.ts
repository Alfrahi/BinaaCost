import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { pb } from "@/integrations/pocketbase/client";

export interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  raw_user_meta_data: any;
}

export function useAdminUserDetails(userId?: string) {
  const { useQuery: useOfflineQuery } = useOfflinePb();

  const userDetailsQueryKey = ["admin_user_details", userId];

  const {
    data: user,
    isLoading: loadingUser,
    error: userError,
  } = useOfflineQuery<UserDetails>({
    queryKey: userDetailsQueryKey,
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const record = await pb.collection("users").getOne(userId);
      return {
        id: record.id,
        email: record.email as string,
        first_name: (record.first_name as string) ?? "",
        last_name: (record.last_name as string) ?? "",
        role: (record.role as string) ?? "user",
        created_at: record.created,
        last_sign_in_at: null,
        raw_user_meta_data: {
          notification_prefs: record.notification_prefs,
          company_name: record.company_name,
          company_website: record.company_website,
        },
      } as UserDetails;
    },
    enabled: !!userId,
  });

  return {
    user,
    loadingUser,
    userError,
  };
}
