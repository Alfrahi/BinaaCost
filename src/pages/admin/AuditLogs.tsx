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
import { X, AlertTriangle, ArrowLeft, Download, Loader2 } from "lucide-react";
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
import { pb } from "@/integrations/pocketbase/client";
import { escapeCsvCell } from "@/features/cost-library/utils/csv";
import { toast } from "sonner";
import { handleError } from "@/shared/lib/toast";

const formatJsonForDisplay = (data: any) => {
  if (!data) return null;
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
};

const ACTIONS = [
  { value: "ALL", labelKey: "admin:auditLogs.allActions" },
  { value: "INSERT", labelKey: "admin:auditLogs.actionInsert" },
  { value: "UPDATE", labelKey: "admin:auditLogs.actionUpdate" },
  { value: "DELETE", labelKey: "admin:auditLogs.actionDelete" },
];

const TABLES = [
  { value: "ALL", labelKey: "admin:auditLogs.allTables" },
  { value: "projects", label: "projects" },
  { value: "materials", label: "materials" },
  { value: "labor_items", label: "labor_items" },
  { value: "equipment_items", label: "equipment_items" },
  { value: "additional_costs", label: "additional_costs" },
  { value: "users", label: "users" },
  { value: "app_settings", label: "app_settings" },
  { value: "project_comments", label: "project_comments" },
];

export default function AuditLogs() {
  const { t, i18n } = useTranslation(["admin", "common", "navigation"]);
  const { formatDate } = useDateFormatter();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [tableFilter, setTableFilter] = useState("ALL");
  const [isExporting, setIsExporting] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { logs, totalLogs, totalPages, isLoading, error } = useAdminAuditLogs(
    search,
    currentPage,
    pageSize,
    actionFilter,
    tableFilter,
  );

  const toggleRowExpansion = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const parts: string[] = [];
      const term = search.trim().replace(/"/g, '\\"');
      if (term) {
        parts.push(
          `(action ~ "${term}" || table_name ~ "${term}" || user_id.email ~ "${term}")`,
        );
      }
      if (actionFilter && actionFilter !== "ALL") {
        parts.push(`action = "${actionFilter}"`);
      }
      if (tableFilter && tableFilter !== "ALL") {
        parts.push(`table_name = "${tableFilter}"`);
      }
      const filter = parts.join(" && ");

      const result = await pb.collection("audit_logs").getList(1, 1000, {
        filter,
        sort: "-created",
        expand: "user_id",
      });

      const headers = [
        "Timestamp",
        "User",
        "Action",
        "Resource",
        "Record ID",
        "Old Data",
        "New Data",
      ];
      const rows = result.items.map((r: any) => [
        escapeCsvCell(r.created),
        escapeCsvCell(r.expand?.user_id?.email || r.user_id || "System"),
        escapeCsvCell(r.action),
        escapeCsvCell(r.table_name),
        escapeCsvCell(r.record_id),
        escapeCsvCell(r.old_data ? JSON.stringify(r.old_data) : ""),
        escapeCsvCell(r.new_data ? JSON.stringify(r.new_data) : ""),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t("admin:auditLogs.exportSuccess"));
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsExporting(false);
    }
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

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
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

          <Select
            value={actionFilter}
            onValueChange={(val) => {
              setActionFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              className="w-[160px] text-sm"
              aria-label={t("admin:auditLogs.actionFilter")}
            >
              <SelectValue placeholder={t("admin:auditLogs.actionFilter")} />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {t(a.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tableFilter}
            onValueChange={(val) => {
              setTableFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              className="w-[170px] text-sm"
              aria-label={t("admin:auditLogs.tableFilter")}
            >
              <SelectValue placeholder={t("admin:auditLogs.tableFilter")} />
            </SelectTrigger>
            <SelectContent>
              {TABLES.map((tb) => (
                <SelectItem key={tb.value} value={tb.value}>
                  {tb.labelKey ? t(tb.labelKey) : tb.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isExporting || totalLogs === 0}
          className="gap-2 text-sm shrink-0"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isExporting
            ? t("admin:auditLogs.exporting")
            : t("admin:auditLogs.exportCsv")}
        </Button>
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
