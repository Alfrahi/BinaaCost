import { Button } from "@/shared/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AssemblyItem } from "@/features/cost-library/assemblies/types/assemblies";
import { safeAdd, safeMult } from "@/shared/lib/math";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";
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
      { key: "type", label: t("common:type"), minWidth: "100px" },
      { key: "description", label: t("common:description"), minWidth: "200px" },
      { key: "quantity", label: t("common:quantity"), minWidth: "120px" },
      { key: "price", label: t("common:price"), minWidth: "120px" },
      { key: "cost", label: t("common:cost"), align: "end", minWidth: "120px" },
      { key: "actions", label: t("common:actions"), align: "end", minWidth: "100px" },
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
            <TableCell className="text-start text-sm">{getTypeLabel(item.item_type)}</TableCell>
            <TableCell className="text-start text-sm">
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
            <TableCell className="text-start text-sm">
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
            <TableCell className="text-start text-sm">
              {numberFormatter.format(item.unit_price)}
            </TableCell>
            <TableCell className="text-end tabular-nums text-sm font-medium">
              {numberFormatter.format(itemCost(item))}
            </TableCell>
            <TableCell className="text-end">
              <div className="flex gap-2 justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(item)}
                  aria-label={`${t("common:edit")} ${item.description}`}
                  className="h-8 w-8"
                >
                  <Edit2 className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(item)}
                  aria-label={`${t("common:delete")} ${item.description}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
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
