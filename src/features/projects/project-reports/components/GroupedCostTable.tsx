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
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={`${ALIGN_CLASS[col.align || "start"]} text-xs font-medium text-muted-foreground uppercase`}
              >
                {col.label}
              </TableHead>
            ))}
            <TableHead className="text-end text-xs font-medium text-muted-foreground uppercase">
              {t("common:total")} ({currency})
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
                    className="font-semibold text-foreground"
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
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={`${ALIGN_CLASS[col.align || "start"]} text-foreground`}
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
                                : item[col.key] || t("common:notSpecified")}
                      </TableCell>
                    ))}
                    <TableCell className="text-end font-medium text-foreground">
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
                className="text-center text-muted-foreground py-4"
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
              className="text-end font-semibold uppercase text-foreground"
            >
              {t("common:subtotal")}
            </TableCell>
            <TableCell className="text-end font-bold text-foreground">
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
