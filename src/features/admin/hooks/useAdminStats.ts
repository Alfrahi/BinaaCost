import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";

export interface AdminStats {
  totalUsers: number;
  activeProjects: number;
  deletedProjects: number;
  totalAuditLogs: number;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin_dashboard_stats"],
    queryFn: async () => {
      const [usersRes, activeProjRes, deletedProjRes, auditRes] = await Promise.all([
        pb.collection("users").getList(1, 1).catch(() => ({ totalItems: 0 })),
        pb
          .collection("projects")
          .getList(1, 1, { filter: 'deleted_at = ""' })
          .catch(() => ({ totalItems: 0 })),
        pb
          .collection("projects")
          .getList(1, 1, { filter: 'deleted_at != ""' })
          .catch(() => ({ totalItems: 0 })),
        pb.collection("audit_logs").getList(1, 1).catch(() => ({ totalItems: 0 })),
      ]);

      return {
        totalUsers: usersRes.totalItems,
        activeProjects: activeProjRes.totalItems,
        deletedProjects: deletedProjRes.totalItems,
        totalAuditLogs: auditRes.totalItems,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
