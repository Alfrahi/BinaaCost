import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Copy, MessageSquare } from "lucide-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { calculateItemCost } from "@/logic/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { EquipmentItem } from "@/types/project-items";

interface EquipmentRowProps {
  item: EquipmentItem;
  currency: string;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComment: (item: EquipmentItem) => void;
  selected: boolean;
  onToggle: () => void;
  rentalOptions: { value: string; label: string }[];
}

export function EquipmentRow({
  item,
  currency,
  isOwner,
  onEdit,
  onDelete,
  onDuplicate,
  onComment,
  selected,
  onToggle,
  rentalOptions,
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
        {isPurchase ? item.quantity : `${item.quantity} `}
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi>
          {format(item.cost_per_period, currency)}
          {!isPurchase &&
            `/${t(item.period_unit, { defaultValue: item.period_unit })}`}
        </bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        {isPurchase ? t("common:notApplicable") : item.usage_duration}
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">
              {format(item.total_cost || 0, currency)}
            </TooltipTrigger>
            <TooltipContent className="p-3 text-xs">
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
            aria-label={t("common:comments")}
            className="h-7 w-7"
          >
            <MessageSquare
              className="w-3 h-3 text-text-secondary"
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
                aria-label={t("common:duplicate")}
                className="h-7 w-7"
              >
                <Copy className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onEdit}
                aria-label={t("common:edit")}
                className="h-7 w-7"
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={onDelete}
                aria-label={t("common:delete")}
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
