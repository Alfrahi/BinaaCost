import { useState } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/lib/pb-mapper";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "@/hooks/useDateFormatter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { useOfflinePb } from "@/hooks/useOfflinePb";
import { sanitizeText } from "@/utils/sanitizeText";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  total_rows: number;
}

const formatJsonForDisplay = (data: any) => {
  if (!data) return null;
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
};

export default function AuditLogs() {
  const { t } = useTranslation(["admin", "common"]);
  const { formatDate } = useDateFormatter();
  const [search, setSearch] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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

  const toggleRowExpansion = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (error) {
    return (
      <div className="text-destructive text-sm">
        {t("common:error")}: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <Breadcrumbs />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("admin:auditLogs.title")}</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder={t("admin:auditLogs.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            aria-label={t("admin:auditLogs.searchPlaceholder")}
            className="text-sm w-full"
          />
          {search && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-0 top-0 h-full px-3 text-sm"
              aria-label={t("common:clearFilters")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start text-xs min-w-[150px]">
                  {t("admin:auditLogs.date")}
                </TableHead>
                <TableHead className="text-start text-xs min-w-[120px]">
                  {t("admin:auditLogs.user")}
                </TableHead>
                <TableHead className="text-start text-xs min-w-[100px]">
                  {t("admin:auditLogs.action")}
                </TableHead>
                <TableHead className="text-start text-xs min-w-[150px]">
                  {t("admin:auditLogs.resource")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-sm">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    {t("admin:auditLogs.noLogsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow
                      onClick={() => toggleRowExpansion(log.id)}
                      className={cn(
                        "cursor-pointer hover:bg-muted",
                        expandedRowId === log.id && "bg-muted",
                      )}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(log.created_at, "dateTime")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {sanitizeText(log.user_email) || log.user_id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {log.action}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {log.table_name} ({log.record_id})
                      </TableCell>
                    </TableRow>
                    {expandedRowId === log.id && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-4 px-6 bg-muted">
                          <div className="space-y-3">
                            {log.old_data && (
                              <div className="text-red-600 text-xs p-2 border rounded bg-red-50/50">
                                <strong>{t("admin:auditLogs.oldData")}</strong>
                                <pre className="whitespace-pre-wrap break-all font-mono text-[10px] mt-1">
                                  {formatJsonForDisplay(log.old_data)}
                                </pre>
                              </div>
                            )}
                            {log.new_data && (
                              <div className="text-green-600 text-xs p-2 border rounded bg-green-50/50">
                                <strong>{t("admin:auditLogs.newData")}</strong>
                                <pre className="whitespace-pre-wrap break-all font-mono text-[10px] mt-1">
                                  {formatJsonForDisplay(log.new_data)}
                                </pre>
                              </div>
                            )}
                            {!log.old_data && !log.new_data && (
                              <div className="text-muted-foreground text-xs">
                                {t("admin:auditLogs.noDetailsAvailable")}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">
            {t("admin:auditLogs.rowsPerPage")}:
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[80px] text-sm">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isLoading}
          >
            {t("common:previous")}
          </Button>
          <span className="text-sm text-text-secondary">
            {t("admin:auditLogs.page")} {currentPage} {t("common:of")}{" "}
            {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={
              currentPage === totalPages || isLoading || totalPages === 0
            }
          >
            {t("common:next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
