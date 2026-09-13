import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Copy, MessageSquare } from "lucide-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { calculateItemCost } from "@/logic/shared";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EquipmentItem } from "@/types/project-items";
import { InlineEditableCell } from "./InlineEditableCell";

interface EquipmentRowProps {
  item: EquipmentItem;
  currency: string;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComment: (item: EquipmentItem) => void;
  onUpdateField: (id: string, field: Partial<EquipmentItem>) => void;
  selected: boolean;
  onToggle: () => void;
  rentalOptions: { value: string; label: string }[];
  /** Project-level location cost multiplier (default 1) */
  locationFactor?: number;
  /** Label for the location factor shown in formula tooltip */
  locationLabel?: string;
}

export function EquipmentRow({
  item,
  currency,
  isOwner,
  onEdit,
  onDelete,
  onDuplicate,
  onComment,
  onUpdateField,
  selected,
  onToggle,
  rentalOptions,
  locationFactor = 1,
  locationLabel,
}: EquipmentRowProps) {
  const { t } = useTranslation(["project_equipment", "common"]);
  const { format } = useCurrencyFormatter();

  const isPurchase = item.rental_or_purchase.toLowerCase() === "purchase";

  const { baseCost } = calculateItemCost.equipment({
    quantity: item.quantity,
    costPerPeriod: item.cost_per_period,
    usageDuration: item.usage_duration,
    maintenanceCost: item.maintenance_cost,
    fuelCost: item.fuel_cost,
  });

  const maintenance = item.maintenance_cost || 0;
  const fuel = item.fuel_cost || 0;
  const baseCostAdjusted = baseCost * locationFactor;
  const totalCost = baseCostAdjusted + maintenance + fuel;

  // Build formula string including location factor when applied
  const periodLabel = isPurchase
    ? ""
    : `/${t(item.period_unit, { defaultValue: item.period_unit })}`;
  const formula = locationFactor !== 1
    ? (isPurchase
        ? `${item.quantity} × ${format(item.cost_per_period, currency)} × ${locationFactor}${locationLabel ? ` (${locationLabel})` : ""} = ${format(totalCost, currency)}`
        : `${item.quantity} × ${format(item.cost_per_period, currency)}${periodLabel} × ${item.usage_duration} × ${locationFactor}${locationLabel ? ` (${locationLabel})` : ""} + ${format(maintenance, currency)} + ${format(fuel, currency)} = ${format(totalCost, currency)}`)
    : (isPurchase
        ? `${item.quantity} × ${format(item.cost_per_period, currency)} = ${format(totalCost, currency)}`
        : `${item.quantity} × ${format(item.cost_per_period, currency)}${periodLabel} × ${item.usage_duration} + ${format(maintenance, currency)} + ${format(fuel, currency)} = ${format(totalCost, currency)}`);

  const rentalOrPurchaseLabel =
    rentalOptions.find((option) => option.value === item.rental_or_purchase)
      ?.label || item.rental_or_purchase;

  return (
    <TableRow>
      <TableCell className="w-[40px]">
        {isOwner && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`${t("common:select")} ${item.name}`}
          />
        )}
      </TableCell>
      <TableCell className="text-start text-sm">{item.name}</TableCell>
      <TableCell className="text-start text-sm">
        {item.type || t("common:notSpecified")}
      </TableCell>
      <TableCell className="text-start text-sm">
        {rentalOrPurchaseLabel}
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.quantity}
            display={String(item.quantity)}
            onCommit={(v) => onUpdateField(item.id, { quantity: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("project_equipment:columns.quantity")} ${item.name}`}
          />
        </bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.cost_per_period}
            display={`${format(item.cost_per_period, currency)}${!isPurchase ? periodLabel : ""}`}
            onCommit={(v) => onUpdateField(item.id, { cost_per_period: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("project_equipment:columns.costPerPeriod")} ${item.name}`}
          />
        </bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        {isPurchase ? (
          t("common:notApplicable")
        ) : (
          <bdi dir="ltr">
            <InlineEditableCell
              value={item.usage_duration}
              display={String(item.usage_duration)}
              onCommit={(v) => onUpdateField(item.id, { usage_duration: v })}
              disabled={!isOwner}
              ariaLabel={`${t("common:edit")} ${t("project_equipment:columns.usageDuration")} ${item.name}`}
            />
          </bdi>
        )}
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild className="cursor-help underline decoration-dotted underline-offset-2">
              <bdi dir="ltr">{format(totalCost, currency)}</bdi>
            </TooltipTrigger>
            <TooltipContent className="p-3 text-xs">
              <div className="font-semibold mb-1">{t("project_equipment:formula")}</div>
              <code className="font-mono text-text-secondary mb-2">{formula}</code>
              <div className="font-semibold mb-1 border-b pb-1">
                {t("project_equipment:breakdown")}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span>{t("project_equipment:baseCost")}:</span>
                <span className="text-end">{format(baseCost, currency)}</span>
                <span>{t("project_equipment:columns.maintenance")}:</span>
                <span className="text-end">
                  {format(maintenance, currency)}
                </span>
                <span>{t("project_equipment:columns.fuel")}:</span>
                <span className="text-end">{format(fuel, currency)}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-end">
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onComment(item)}
            title={t("common:comments")}
            aria-label={`${t("common:comments")} ${item.name}`}
            className="h-8 w-8"
          >
            <MessageSquare
              className="w-4 h-4 text-text-secondary"
              aria-hidden="true"
            />
          </Button>
          {isOwner && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={onDuplicate}
                title={t("common:duplicate")}
                aria-label={`${t("common:duplicate")} ${item.name}`}
                className="h-8 w-8"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onEdit}
                title={t("common:edit")}
                aria-label={`${t("common:edit")} ${item.name}`}
                className="h-8 w-8"
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={onDelete}
                title={t("common:delete")}
                aria-label={`${t("common:delete")} ${item.name}`}
                className="h-8 w-8"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
