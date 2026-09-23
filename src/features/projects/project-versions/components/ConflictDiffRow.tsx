import React from "react";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Plus, Minus, Pencil } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { TFunction } from "i18next";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";
import { Risk, ProjectGroup } from "@/features/projects/project-core/types/project";
import { AnyItem, CategoryKey, getDisplayLabel } from "../utils/versionDiff";
import { ResolutionMap } from "../types";

const getDetailsDisplay = (
  item: AnyItem,
  type: CategoryKey,
  t: TFunction,
  formatCurrency: (amount: number, currencyCode: string, options?: any) => string,
  currency: string,
  options: any, // or unknown, but leave it for now
) => {
  switch (type) {
    case "materials": {
      const mat = item as MaterialItem;
      const unitLabel =
        options.material_unit.find((u: any) => u.value === mat.unit)?.label ||
        mat.unit;
      return (
        <bdi>
          {`${mat.quantity} ${unitLabel} @ ${formatCurrency(mat.unit_price, currency)}`}
        </bdi>
      );
    }
    case "labor": {
      const lab = item as LaborItem;
      return (
        <bdi>
          {`${lab.number_of_workers} ${t("project_detail:reports.workersUnit")} × ${lab.total_days} ${t("project_equipment:Day")} @ ${formatCurrency(lab.daily_rate, currency)}`}
        </bdi>
      );
    }
    case "equipment": {
      const eq = item as EquipmentItem;
      const periodUnitLabel =
        options.equipment_period_unit.find(
          (u: any) => u.value === eq.period_unit,
        )?.label || eq.period_unit;
      return (
        <bdi>
          {`${eq.quantity} ${periodUnitLabel} @ ${formatCurrency(eq.cost_per_period, currency)}`}
        </bdi>
      );
    }
    case "additional": {
      const add = item as AdditionalCostItem;
      return (
        <bdi>
          {formatCurrency(add.amount, currency)}
        </bdi>
      );
    }
    case "risks": {
      const risk = item as Risk;
      const probLabel =
        options.risk_probability.find((p: any) => p.value === risk.probability)
          ?.label || risk.probability;
      return (
        <bdi>
          {`${probLabel} - Impact: ${formatCurrency(risk.impact_amount, currency)}`}
        </bdi>
      );
    }
    case "groups":
      return (
        <bdi>
          {`Order: ${(item as ProjectGroup).sort_order}`}
        </bdi>
      );
    default:
      return (
        <bdi></bdi>
      );
  }
};

interface ConflictDiffRowProps {
  item: AnyItem;
  type: CategoryKey;
  status: "current_only" | "version_only" | "modified";
  versionItem?: AnyItem;
  selectedResolution: ResolutionMap;
  onToggleResolution: (
    item: AnyItem,
    type: CategoryKey,
    action: "add" | "remove" | "update" | "keep_current" | "ignore",
  ) => void;
  formatCurrency: (amount: number, currencyCode: string, options?: any) => string;
  currentCurrency: string;
  versionCurrency: string;
  t: TFunction;
  allOptions: any;
}

export const ConflictDiffRow = React.memo(({
  item,
  type,
  status,
  versionItem,
  selectedResolution,
  onToggleResolution,
  formatCurrency,
  currentCurrency,
  versionCurrency,
  t,
  allOptions,
}: ConflictDiffRowProps) => {
  const isAdded = selectedResolution[type].toAdd.some(
    (i: any) => i.id === item.id,
  );
  const isRemoved = selectedResolution[type].toRemove.includes(item.id);
  const isUpdated = selectedResolution[type].toUpdate.some(
    (i: any) => i.id === item.id,
  );

  const currentDisplay = getDisplayLabel(item, type, t);
  const currentDetails = getDetailsDisplay(
    item,
    type,
    t,
    formatCurrency,
    currentCurrency,
    allOptions,
  );
  const versionDetails = versionItem
    ? getDetailsDisplay(
        versionItem,
        type,
        t,
        formatCurrency,
        versionCurrency,
        allOptions,
      )
    : "";

  return (
    <TableRow key={item.id}>
      <TableCell className="p-2 text-sm">
        <div className="flex items-center gap-2">
          {status === "version_only" && (
            <Checkbox
              checked={isAdded}
              onCheckedChange={() =>
                onToggleResolution(item, type, isAdded ? "ignore" : "add")
              }
              aria-label={t("project_versions:add")}
            />
          )}
          {status === "current_only" && (
            <Checkbox
              checked={!isRemoved}
              onCheckedChange={() =>
                onToggleResolution(
                  item,
                  type,
                  isRemoved ? "keep_current" : "remove",
                )
              }
              aria-label={t("project_versions:keepCurrent")}
            />
          )}
          {status === "modified" && (
            <Checkbox
              checked={!isUpdated}
              onCheckedChange={() =>
                onToggleResolution(
                  item,
                  type,
                  isUpdated ? "keep_current" : "update",
                )
              }
              aria-label={t("project_versions:keepCurrent")}
            />
          )}
          <span
            className={cn(
              status === "current_only" &&
                isRemoved &&
                "line-through text-destructive",
              status === "version_only" &&
                isAdded &&
                "text-success font-medium",
              status === "modified" &&
                isUpdated &&
                "text-primary font-medium",
            )}
          >
            {currentDisplay}
          </span>
        </div>
      </TableCell>
      <TableCell className="p-2 text-sm text-muted-foreground">{currentDetails}</TableCell>
      <TableCell className="p-2 text-sm">
        {status === "version_only" && (
          <div className="flex items-center gap-2 text-success">
            <Plus className="w-4 h-4" /> {t("project_versions:status_added")}
          </div>
        )}
        {status === "current_only" && (
          <div className="flex items-center gap-2 text-destructive">
            <Minus className="w-4 h-4" />{" "}
            {t("project_versions:status_removed")}
          </div>
        )}
        {status === "modified" && (
          <div className="flex items-center gap-2 text-primary">
            <Pencil className="w-4 h-4" />{" "}
            {t("project_versions:status_modified")}
          </div>
        )}
      </TableCell>
      <TableCell className="p-2 text-sm text-muted-foreground">
        {status === "modified" && (
          <span className={cn(isUpdated && "text-primary font-medium")}>
            {versionDetails}
          </span>
        )}
        {status === "version_only" && (
          <span className={cn(isAdded && "text-success font-medium")}>
            {versionDetails}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
});
