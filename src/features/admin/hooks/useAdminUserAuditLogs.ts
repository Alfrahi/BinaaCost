import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/shared/lib/pb-mapper";

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
  user_email: string | null;
  total_rows: number;
}

export function useAdminUserAuditLogs(userId?: string) {
  const { useQuery: useOfflineQuery } = useOfflinePb();

  const queryKey = ["admin_user_logs", userId];

  const {
    data: logs,
    isLoading,
    error,
  } = useOfflineQuery<AuditLog[]>({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      const records = await pb.collection("audit_logs").getFullList({
        filter: `user_id="${userId}"`,
        sort: "-created",
        expand: "user_id",
      });
      return mapRecords<any>(records).map((r) => ({
        ...r,
        user_email: r.expand?.user_id?.email ?? null,
      }));
    },
    enabled: !!userId,
  });

  return {
    logs: logs ?? [],
    isLoading,
    error,
  };
}
