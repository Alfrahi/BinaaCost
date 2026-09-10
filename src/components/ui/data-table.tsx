"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/PaginationControls";
import { useTranslation } from "react-i18next";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "start" | "end";
  isCurrency?: boolean;
  format?: (value: any, row: T) => React.ReactNode;
  className?: string;
  minWidth?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  renderRow: (row: T) => React.ReactNode;
  grandTotal?: React.ReactNode;
  grandTotalLabel?: string;
  grandTotalColSpan?: number;
  emptyMessage?: string;
  emptyMessageKey?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
  };
  selection?: {
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggle: (id: string) => void;
    onToggleAll: () => void;
    selectAllLabel?: string;
  };
  ariaLabel?: string;
  className?: string;
  stickyHeader?: boolean;
  groupRows?: {
    groups: { id: string; name: string }[];
    getGroupId: (row: T) => string | undefined;
    ungroupedLabel?: string;
    ungroupedLabelKey?: string;
  };
}

function DataTable<T>({
  columns,
  data,
  renderRow,
  grandTotal,
  grandTotalLabel,
  grandTotalColSpan,
  emptyMessage,
  emptyMessageKey,
  pagination,
  selection,
  ariaLabel,
  className,
  stickyHeader = false,
  groupRows,
  t,
}: Omit<DataTableProps<T>, "getRowKey"> & { t: (key: string, options?: any) => string }) {
  const hasSelection = !!selection;
  const hasGroups = !!groupRows;

  const displayData = React.useMemo(() => {
    if (!hasGroups || !groupRows.groups || groupRows.groups.length === 0) {
      return data.map((row) => ({ type: "item" as const, row }));
    }

    const grouped: Record<string, T[]> = {};
    const ungrouped: T[] = [];

    data.forEach((row) => {
      const groupId = groupRows.getGroupId(row);
      if (groupId && groupId !== "ungrouped") {
        if (!grouped[groupId]) grouped[groupId] = [];
        grouped[groupId].push(row);
      } else {
        ungrouped.push(row);
      }
    });

    const result: Array<{ type: "header" | "item"; group?: { id: string; name: string }; row?: T }> = [];

    groupRows.groups.forEach((group) => {
      const groupItems = grouped[group.id] || [];
      if (groupItems.length > 0) {
        result.push({ type: "header", group });
        groupItems.forEach((row) => result.push({ type: "item", row }));
      }
    });

    if (ungrouped.length > 0) {
      if (groupRows.groups.length > 0) {
        result.push({
          type: "header",
          group: {
            id: "ungrouped",
            name: groupRows.ungroupedLabel || t(groupRows.ungroupedLabelKey || "project_detail:groups.ungrouped"),
          },
        });
      }
      ungrouped.forEach((row) => result.push({ type: "item", row }));
    }

    return result;
  }, [data, hasGroups, groupRows, t]);

  const totalColSpan = columns.length + (hasSelection ? 1 : 0);

  return (
    <div className={cn("overflow-x-auto border rounded-lg", className)}>
      <Table aria-label={ariaLabel} className="w-full">
        <TableHeader>
          <TableRow className={cn(stickyHeader && "sticky top-0 z-10 bg-muted")}>
            {hasSelection && (
              <TableHead className={cn("w-[40px] text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10", selection?.selectAllLabel && "cursor-pointer")}>
                <Checkbox
                  checked={selection?.allSelected ?? false}
                  onCheckedChange={selection?.onToggleAll}
                  aria-label={selection?.selectAllLabel || t("common:all")}
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  `text-${col.align || "start"} text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10 tabular-nums`,
                  col.className,
                  col.minWidth && `min-w-[${col.minWidth}]`,
                )}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={totalColSpan}
                className="text-center h-24 text-sm text-muted-foreground"
              >
                {emptyMessage || (emptyMessageKey ? t(emptyMessageKey) : t("common:noItems"))}
              </TableCell>
            </TableRow>
          ) : (
            displayData.map((item) => {
              if (item.type === "header") {
                return (
                  <TableRow key={`header-${item.group?.id}`} className="bg-muted hover:bg-muted">
                    <TableCell
                      colSpan={totalColSpan}
                      className="font-semibold text-foreground text-sm"
                    >
                      {item.group?.name}
                    </TableCell>
                  </TableRow>
                );
              }
              return renderRow(item.row!);
            })
          )}
        </TableBody>
        {grandTotal && (
          <TableFooter>
            <TableRow className="bg-muted">
              <TableCell
                colSpan={grandTotalColSpan ?? columns.length - 1}
                className="text-end font-semibold uppercase text-foreground"
              >
                {grandTotalLabel || t("common:subtotal")}
              </TableCell>
              <TableCell className="text-end font-bold text-foreground tabular-nums">
                {grandTotal}
              </TableCell>
              {hasSelection && <TableCell className="bg-muted" />}
            </TableRow>
          </TableFooter>
        )}
      </Table>
      {pagination && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}

function DataTableWrapper<T>(props: DataTableProps<T>) {
  const { t } = useTranslation();
  return <DataTable {...props} t={t} />;
}

DataTableWrapper.displayName = "DataTable";

export default DataTableWrapper;