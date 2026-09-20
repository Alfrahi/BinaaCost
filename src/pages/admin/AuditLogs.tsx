import { useState } from "react";
import PageHeader from "@/shared/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { X, AlertTriangle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { cn } from "@/shared/lib/utils";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import EmptyState from "@/shared/components/ui/EmptyState";
import LoadingState from "@/shared/components/ui/LoadingState";
import React from "react";
import { useAdminAuditLogs } from "@/features/admin/hooks/useAdminAuditLogs";

const formatJsonForDisplay = (data: any) => {
  if (!data) return null;
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
};

export default function AuditLogs() {
  const { t, i18n } = useTranslation(["admin", "common", "navigation"]);
  const { formatDate } = useDateFormatter();
  const [search, setSearch] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { logs, totalPages, isLoading, error } = useAdminAuditLogs(
    search,
    currentPage,
    pageSize,
  );

  const toggleRowExpansion = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
        <AlertDescription className="text-sm">{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin" aria-label={t("navigation:adminPanel")}>
                <ArrowLeft
                  className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <span>{t("admin:auditLogs.title")}</span>
          </div>
        }
      />

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
              className="absolute end-0 top-0 h-full px-3 text-sm"
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
                <TableHead variant="data" className="min-w-[150px]">
                  {t("admin:auditLogs.date")}
                </TableHead>
                <TableHead variant="data" className="min-w-[120px]">
                  {t("admin:auditLogs.user")}
                </TableHead>
                <TableHead variant="data" className="min-w-[100px]">
                  {t("admin:auditLogs.action")}
                </TableHead>
                <TableHead variant="data" className="min-w-[150px]">
                  {t("admin:auditLogs.resource")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 px-3">
                    <LoadingState />
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 px-3">
                    <EmptyState message={t("admin:auditLogs.noLogsFound")} />
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
                      <TableCell className="whitespace-nowrap text-sm px-3 py-2">
                        {formatDate(log.created_at, "dateTime")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm px-3 py-2">
                        {sanitizeText(log.user_email) || log.user_id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm px-3 py-2">
                        {log.action}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm px-3 py-2">
                        {log.table_name} ({log.record_id})
                      </TableCell>
                    </TableRow>
                    {expandedRowId === log.id && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-4 px-6 bg-muted">
                          <div className="space-y-3">
                            {log.old_data && (
                              <div className="text-destructive text-xs p-2 border rounded-sm bg-destructive/10">
                                <strong>{t("admin:auditLogs.oldData")}</strong>
                                <pre className="whitespace-pre-wrap break-all font-mono text-2xs mt-1">
                                  {formatJsonForDisplay(log.old_data)}
                                </pre>
                              </div>
                            )}
                            {log.new_data && (
                              <div className="text-success text-xs p-2 border rounded-sm bg-success/10">
                                <strong>{t("admin:auditLogs.newData")}</strong>
                                <pre className="whitespace-pre-wrap break-all font-mono text-2xs mt-1">
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
          <span className="text-sm text-muted-foreground">
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
              <SelectValue placeholder={pageSize}>
                {String(pageSize)}
              </SelectValue>
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
          <span className="text-sm text-muted-foreground">
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
