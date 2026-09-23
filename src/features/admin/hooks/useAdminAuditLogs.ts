import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";

import type { AuditLog } from "../types/audit";
export type { AuditLog };

export function useAdminAuditLogs(
  search: string,
  currentPage: number,
  pageSize: number,
  actionFilter: string = "ALL",
  tableFilter: string = "ALL",
) {
  const { useQuery: useOfflineQuery } = useOfflinePb();

  const queryKey = [
    "audit_logs",
    search,
    currentPage,
    pageSize,
    actionFilter,
    tableFilter,
  ];

  const {
    data: logsData = [],
    isLoading,
    error,
  } = useOfflineQuery<AuditLog[]>({
    queryKey,
    queryFn: async () => {
      const parts: string[] = [];
      const term = search.trim().replace(/"/g, '\\"');
      if (term) {
        if (/^[a-z0-9]{15}$/i.test(term)) {
          parts.push(`(record_id = "${term}")`);
        } else {
          parts.push(`(action ~ "${term}" || table_name ~ "${term}" || user_id.email ~ "${term}")`);
        }
      }
      if (actionFilter && actionFilter !== "ALL") {
        parts.push(`action = "${actionFilter}"`);
      }
      if (tableFilter && tableFilter !== "ALL") {
        parts.push(`table_name = "${tableFilter}"`);
      }
      const filter = parts.join(" && ");

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

  const logs = logsData ?? [];
  const totalLogs = logs.length > 0 ? (logs[0]?.total_rows ?? 0) : 0;
  const totalPages = Math.ceil(totalLogs / pageSize);

  return {
    logs,
    totalLogs,
    totalPages,
    isLoading,
    error,
  };
}
