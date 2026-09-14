import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AssemblyItem } from "@/types/assemblies";
import { safeAdd, safeMult } from "@/utils/math";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import DataTable, {
  DataTableColumn,
} from "@/components/ui/data-table";
import React, { useCallback, useMemo } from "react";

// Assemblies are currency-agnostic library items: their unit prices are stored
// as raw numbers and should render without a currency symbol (the project
// currency is applied only when the assembly is imported into a project).
const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface AssemblyItemsTableProps {
  items: AssemblyItem[];
  onEdit: (item: AssemblyItem) => void;
  onDelete: (item: AssemblyItem) => void;
  materialUnits: { value: string; label: string }[];
  periodUnits: { value: string; label: string }[];
  additionalCategories: { value: string; label: string }[];
}

/** Extended cost of a single assembly item (qty × rate, with type-specific multipliers). */
function itemCost(item: AssemblyItem): number {
  const details = item.details as
    | { total_days?: number; usage_duration?: number; maintenance_cost?: number | null; fuel_cost?: number | null }
    | null;
  if (item.item_type === "labor") {
    return safeMult(item.quantity, item.unit_price, details?.total_days ?? 1);
  }
  if (item.item_type === "equipment") {
    const base = safeMult(
      item.quantity,
      item.unit_price,
      details?.usage_duration ?? 1,
    );
    return safeAdd(base, details?.maintenance_cost ?? 0, details?.fuel_cost ?? 0);
  }
  if (item.item_type === "additional") {
    return item.unit_price;
  }
  return safeMult(item.quantity, item.unit_price);
}

export const AssemblyItemsTable = React.memo(function AssemblyItemsTable({
  items,
  onEdit,
  onDelete,
  materialUnits,
  periodUnits,
  additionalCategories,
}: AssemblyItemsTableProps) {
  const { t } = useTranslation([
    "common",
    "project_detail",
    "project_equipment",
    "project_tabs",
    "project_additional",
  ]);
  const grandTotal = useMemo(
    () => items.reduce((sum, item) => safeAdd(sum, itemCost(item)), 0),
    [items],
  );

  const getUnitLabel = useCallback(
    (unit: string | null, type: string) => {
      if (!unit) return t("common:notSpecified");
      if (type === "material") {
        return materialUnits.find((u) => u.value === unit)?.label || unit;
      }
      if (type === "equipment") {
        return periodUnits.find((u) => u.value === unit)?.label || unit;
      }
      return unit;
    },
    [materialUnits, periodUnits, t],
  );

  const getTypeLabel = useCallback(
    (type: string) => {
      const keyMap: Record<string, string> = {
        material: "materials",
        labor: "labor",
        equipment: "equipment",
        additional: "additional",
      };
      return t(`project_tabs:${keyMap[type] || type}`);
    },
    [t],
  );

  const columns = useMemo<DataTableColumn<AssemblyItem>[]>(
    () => [
      { key: "type", label: t("common:type") },
      { key: "description", label: t("common:description") },
      { key: "quantity", label: t("common:quantity") },
      { key: "price", label: t("common:price") },
      { key: "cost", label: t("common:cost"), align: "end" },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowKey={(item) => item.id}
      renderRow={(item) => {
        const itemDetails = item.details;
        return (
          <TableRow key={item.id}>
            <TableCell className="capitalize text-start text-sm min-w-[100px]">
              {getTypeLabel(item.item_type)}
            </TableCell>
            <TableCell className="text-start text-sm min-w-[200px]">
              <div className="font-medium">{item.description}</div>
              {item.item_type === "additional" &&
                itemDetails &&
                "category" in itemDetails && (
                  <div className="text-xs text-muted-foreground">
                    {additionalCategories.find(
                      (c) => c.value === itemDetails.category,
                    )?.label || itemDetails.category}
                  </div>
                )}
            </TableCell>
            <TableCell className="text-start text-sm min-w-[150px]">
              {item.item_type === "labor" &&
              itemDetails &&
              "total_days" in itemDetails ? (
                <span>
                  {item.quantity} {t("project_detail:reports.workersUnit")}
                  {` × ${itemDetails.total_days} ${t("project_equipment:Day")}`}
                </span>
              ) : (
                <>
                  {item.quantity} {getUnitLabel(item.unit, item.item_type)}
                </>
              )}
            </TableCell>
            <TableCell className="text-start text-sm min-w-[120px]">
              {numberFormatter.format(item.unit_price)}
            </TableCell>
            <TableCell className="text-end tabular-nums text-sm font-medium min-w-[120px]">
              {numberFormatter.format(itemCost(item))}
            </TableCell>
            <TableCell className="text-end text-sm min-w-[100px]">
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEdit(item)}
                  aria-label={`${t("common:edit")} ${item.description}`}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(item)}
                  aria-label={`${t("common:delete")} ${item.description}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      }}
      grandTotal={numberFormatter.format(grandTotal)}
      grandTotalLabel={t("common:total")}
      grandTotalColSpan={5}
      emptyMessage={t("common:noItems")}
      ariaLabel={t("common:type")}
    />
  );
});
