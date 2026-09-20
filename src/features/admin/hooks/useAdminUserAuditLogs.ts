import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";

import type { AuditLog } from "../types/audit";
export type { AuditLog };

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
