"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/shared/components/ui/table";
import { PaginationControls } from "@/shared/components/PaginationControls";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown, ChevronsUpDown, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

export const ALIGN_CLASS = { start: "text-start", end: "text-end" } as const;
export const MIN_WIDTH_CLASSES: Record<string, string> = {
  "60px": "min-w-[60px]",
  "80px": "min-w-[80px]",
  "100px": "min-w-[100px]",
  "120px": "min-w-[120px]",
  "150px": "min-w-[150px]",
  "200px": "min-w-[200px]",
  "240px": "min-w-[240px]",
} as const;

export type MinWidthToken = keyof typeof MIN_WIDTH_CLASSES;

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "start" | "end";
  isCurrency?: boolean;
  format?: (value: any, row: T) => React.ReactNode;
  className?: string;
  minWidth?: MinWidthToken | string;
  /** Value used for sorting. Defaults to `row[col.key]`. */
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  renderRow: (row: T) => React.ReactNode;
  grandTotal?: React.ReactNode;
  grandTotalLabel?: string;
  grandTotalColSpan?: number;
  emptyMessage?: React.ReactNode;
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
  cellPadding?: "compact" | "comfortable";
  groupRows?: {
    groups: { id: string; name: string }[];
    getGroupId: (row: T) => string | undefined;
    ungroupedLabel?: string;
    ungroupedLabelKey?: string;
  };
  /** Show a search box that filters rows by `getSearchText`. */
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (row: T) => string;
  /** Enable sortable column headers. */
  sortable?: boolean;
  /** Show a centered loading spinner row instead of the empty state. */
  isLoading?: boolean;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

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
  cellPadding = "comfortable",
  groupRows,
  searchable = false,
  searchPlaceholder,
  getSearchText,
  sortable = false,
  isLoading = false,
  t,
}: Omit<DataTableProps<T>, "getRowKey"> & { t: (key: string, options?: any) => string }) {
  const hasSelection = !!selection;
  const hasGroups = !!groupRows;
  const paddingClasses = cellPadding === "compact" ? "px-3 py-2" : "p-4";
  const headerHeightClass = "h-10";
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortState>(null);

  const filteredData = React.useMemo(() => {
    let rows = data;
    if (searchable && search.trim() && getSearchText) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((row) => getSearchText(row).toLowerCase().includes(term));
    }
    if (sort && sortable) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const getVal = col.sortValue ?? ((row: T) => (row as any)[col.key]);
        const dir = sort.dir === "asc" ? 1 : -1;
        rows = [...rows].sort((a, b) => {
          const av = getVal(a);
          const bv = getVal(b);
          if (typeof av === "number" && typeof bv === "number") {
            return (av - bv) * dir;
          }
          return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
        });
      }
    }
    return rows;
  }, [data, searchable, search, getSearchText, sort, sortable, columns]);

  const displayData = React.useMemo(() => {
    if (!hasGroups || !groupRows.groups || groupRows.groups.length === 0) {
      return filteredData.map((row) => ({ type: "item" as const, row }));
    }

    const grouped: Record<string, T[]> = {};
    const ungrouped: T[] = [];

    filteredData.forEach((row) => {
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
  }, [filteredData, hasGroups, groupRows, t]);

  const totalColSpan = columns.length + (hasSelection ? 1 : 0);

  const handleSort = (col: DataTableColumn<T>) => {
    if (!sortable) return;
    setSort((prev) => {
      if (prev?.key === col.key) {
        return prev.dir === "asc" ? { key: col.key, dir: "desc" } : null;
      }
      return { key: col.key, dir: "asc" };
    });
  };

  const SortIcon = ({ col }: { col: DataTableColumn<T> }) => {
    if (!sortable) return null;
    if (sort?.key === col.key) {
      return sort.dir === "asc" ? (
        <ArrowUp className="inline-block w-3 h-3 ms-1" aria-hidden="true" />
      ) : (
        <ArrowDown className="inline-block w-3 h-3 ms-1" aria-hidden="true" />
      );
    }
    return (
      <ChevronsUpDown
        className="inline-block w-3 h-3 ms-1 text-muted-foreground/50"
        aria-hidden="true"
      />
    );
  };

  return (
    <div className={cn("border rounded-lg", className)}>
      {searchable && (
        <div className="relative p-3 border-b">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder || t("common:search")}
            aria-label={searchPlaceholder || t("common:search")}
            className="ps-9 pe-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearch("")}
              className="absolute end-1 top-1/2 -translate-y-1/2 h-8 w-8"
              aria-label={t("common:clearFilters")}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <Table aria-label={ariaLabel} className="w-full">
          <TableHeader>
            <TableRow className={cn(stickyHeader && "sticky top-0 z-10 bg-muted")}>
              {hasSelection && (
                <TableHead className={cn("w-[40px] text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted", headerHeightClass, selection?.selectAllLabel && "cursor-pointer")}>
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
                    `${ALIGN_CLASS[col.align || "start"]} text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted`,
                    headerHeightClass,
                    (col.align === "end" || col.isCurrency) && "tabular-nums",
                    col.className,
                    col.minWidth && MIN_WIDTH_CLASSES[col.minWidth],
                    sortable && "cursor-pointer select-none",
                  )}
                  onClick={sortable ? () => handleSort(col) : undefined}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.label}
                  <SortIcon col={col} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={totalColSpan}
                  className={cn("text-center", paddingClasses)}
                >
                  <Loader2
                    className="w-6 h-6 animate-spin mx-auto"
                    aria-hidden="true"
                  />
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalColSpan}
                  className={cn("text-center text-sm text-muted-foreground", paddingClasses)}
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
                        className={cn("font-semibold text-foreground text-sm", paddingClasses)}
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
                  colSpan={grandTotalColSpan ?? (columns.length + (hasSelection ? 1 : 0) - 1)}
                  className={cn("text-end font-semibold uppercase text-foreground", paddingClasses)}
                >
                  {grandTotalLabel || t("common:subtotal")}
                </TableCell>
                <TableCell className={cn("text-end font-bold text-foreground tabular-nums", paddingClasses)}>
                  {grandTotal}
                </TableCell>
                {hasSelection && <TableCell className={cn("bg-muted", paddingClasses)} />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
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