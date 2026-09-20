import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";

import type { AuditLog } from "../types/audit";
export type { AuditLog };

export function useAdminAuditLogs(
  search: string,
  currentPage: number,
  pageSize: number,
) {
  const { useQuery: useOfflineQuery } = useOfflinePb();

  const queryKey = ["audit_logs", search, currentPage, pageSize];

  const {
    data: logsData = [],
    isLoading,
    error,
  } = useOfflineQuery<AuditLog[]>({
    queryKey,
    queryFn: async () => {
      const term = search.trim().replace(/"/g, '\\"');
      const filter = term
        ? `(action ~ "${term}" || table_name ~ "${term}" || user_id.email ~ "${term}")`
        : "";
      const result = await pb.collection("audit_logs").getList(
        currentPage,
        pageSize,
        { filter, sort: "-created", expand: "user_id" },
      );
      return mapRecords<any>(result.items).map((r) => ({
        ...r,
        user_email: r.expand?.user_id?.email ?? "",
        total_rows: result.totalItems,
      }));
    },
    staleTime: 1000 * 30,
  });

  const logs = logsData;
  const totalLogs = logs.length > 0 ? logs[0].total_rows : 0;
  const totalPages = Math.ceil(totalLogs / pageSize);

  return {
    logs,
    totalLogs,
    totalPages,
    isLoading,
    error,
  };
}
