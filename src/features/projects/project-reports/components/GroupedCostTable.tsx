import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/shared/components/ui/table";
import { ALIGN_CLASS } from "@/shared/components/ui/data-table";
import { cn } from "@/shared/lib/utils";
import { calculateItemCost, calculateCategoryTotal } from "@/shared/logic/shared";
import { ProjectGroup } from "@/features/projects/project-core/types/project";

interface GroupedCostTableProps {
  items: any[];
  itemType: "materials" | "labor" | "equipment" | "additional";
  columns: {
    key: string;
    label: string;
    isCurrency?: boolean;
    align?: "start" | "end";
  }[];
  groups: ProjectGroup[];
  currency: string;
  formatCurrency: (value: number, currency: string) => string;
  getOptionLabel: (category: string, value: string) => string;
  t: any;
}

export const GroupedCostTable = React.memo<GroupedCostTableProps>(({
  items,
  itemType,
  columns,
  groups,
  currency,
  formatCurrency,
  getOptionLabel,
  t,
}) => {
  const groupedItems: Record<string, any[]> = {};
  items.forEach((item) => {
    const groupId = item.group_id || "ungrouped";
    if (!groupedItems[groupId]) {
      groupedItems[groupId] = [];
    }
    groupedItems[groupId].push(item);
  });

  const sortedGroupIds = [...groups.map((g) => g.id), "ungrouped"].filter(
    (id) => groupedItems[id] && groupedItems[id].length > 0,
  );

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="bg-muted">
            {columns.map((col) => {
              const isDescription = col.key === "description";
              const isEquipmentName = itemType === "equipment" && col.key === "name";

              return (
                <TableHead
                  key={col.key}
                  className={cn(
                    ALIGN_CLASS[col.align || (col.isCurrency ? "end" : "start")],
                    !isDescription && !isEquipmentName && "whitespace-nowrap",
                    isDescription && "min-w-[140px]",
                    isEquipmentName && "w-[110px] min-w-[90px] max-w-[130px] whitespace-normal break-words",
                    "text-xs font-medium text-muted-foreground uppercase px-2 py-2 h-9",
                  )}
                >
                  {col.label}
                </TableHead>
              );
            })}
            <TableHead className="text-end text-xs font-medium text-muted-foreground uppercase whitespace-nowrap px-2 py-2 h-9">
              {itemType === "equipment"
                ? `${t("project_equipment:columns.estTotalCost", "Est. Total")} (${currency})`
                : `${t("common:total")} (${currency})`}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedGroupIds.map((groupId) => (
            <React.Fragment key={groupId}>
              {groupId !== "ungrouped" && (
                <TableRow className="bg-muted">
                  <TableCell
                    colSpan={columns.length + 1}
                    className="font-semibold text-foreground text-start px-2 py-2 text-xs"
                  >
                    {groups.find((g) => g.id === groupId)?.name}
                  </TableCell>
                </TableRow>
              )}
              {groupedItems[groupId].map((item: any, index: number) => {
                let itemTotal = 0;
                switch (itemType) {
                  case "materials":
                    itemTotal = calculateItemCost.material(
                      item.quantity,
                      item.unit_price,
                    );
                    break;
                  case "labor":
                    itemTotal = calculateItemCost.labor(
                      item.number_of_workers,
                      item.daily_rate,
                      item.total_days,
                    );
                    break;
                  case "equipment":
                    itemTotal = calculateItemCost.equipment({
                      quantity: item.quantity,
                      costPerPeriod: item.cost_per_period,
                      usageDuration: item.usage_duration,
                      maintenanceCost: item.maintenance_cost,
                      fuelCost: item.fuel_cost,
                      rentalOrPurchase: item.rental_or_purchase,
                    }).totalCost;
                    break;
                  case "additional":
                    itemTotal = item.amount;
                    break;
                }

                return (
                  <TableRow
                    key={item.id || index}
                    className="border-t border-border"
                  >
                    {columns.map((col) => {
                      const isEndAligned = col.align === "end" || col.isCurrency;
                      const isDescription = col.key === "description";
                      const isEquipmentName = itemType === "equipment" && col.key === "name";

                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            ALIGN_CLASS[col.align || (col.isCurrency ? "end" : "start")],
                            isEndAligned && "tabular-nums",
                            !isDescription && !isEquipmentName && "whitespace-nowrap",
                            isDescription && "min-w-[140px]",
                            isEquipmentName && "w-[110px] min-w-[90px] max-w-[130px] whitespace-normal break-words",
                            "text-foreground px-2 py-2 text-xs",
                          )}
                        >
                          {col.isCurrency
                            ? formatCurrency(item[col.key], currency)
                            : col.key === "unit" && itemType === "materials"
                              ? getOptionLabel("material_unit", item[col.key])
                              : col.key === "period_unit" &&
                                  itemType === "equipment"
                                ? getOptionLabel(
                                    "equipment_period_unit",
                                    item[col.key],
                                  )
                                : col.key === "category" &&
                                    itemType === "additional"
                                  ? getOptionLabel(
                                      "additional_cost_category",
                                      item[col.key],
                                    )
                                  : col.key === "rental_or_purchase"
                                    ? getOptionLabel(
                                        "rental_or_purchase",
                                        item[col.key],
                                      ) ||
                                      (item[col.key]?.toLowerCase() === "purchase"
                                        ? t("project_equipment:columns.Purchase", "Purchase")
                                        : t("project_equipment:columns.Rental", "Rental"))
                                    : item[col.key] || t("common:notSpecified")}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-end font-medium tabular-nums text-foreground whitespace-nowrap px-2 py-2 text-xs">
                      {formatCurrency(itemTotal, currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="text-center text-muted-foreground py-3 text-xs"
              >
                {t("common:noItems")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted">
            <TableCell
              colSpan={columns.length}
              className="text-end font-semibold uppercase text-foreground whitespace-nowrap px-2 py-2 text-xs"
            >
              {t("common:subtotal")}
            </TableCell>
            <TableCell className="text-end font-bold tabular-nums text-foreground whitespace-nowrap px-2 py-2 text-xs">
              {formatCurrency(
                calculateCategoryTotal[itemType](items as any),
                currency,
              )}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
});

GroupedCostTable.displayName = "GroupedCostTable";
