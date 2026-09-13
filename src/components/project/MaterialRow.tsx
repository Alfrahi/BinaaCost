import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Copy, MessageSquare } from "lucide-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { calculateItemCost } from "@/logic/shared";
import { useTranslation } from "react-i18next";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MaterialItem } from "@/types/project-items";
import { InlineEditableCell } from "./InlineEditableCell";

interface MaterialRowProps {
  item: MaterialItem;
  materialUnits: { value: string; label: string }[];
  currency: string;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComment: (item: MaterialItem) => void;
  onUpdateField: (id: string, field: Partial<MaterialItem>) => void;
  selected: boolean;
  onToggle: () => void;
  /** Project level location cost multiplier (default 1) */
  locationFactor?: number;
  /** Label for the location factor (e.g. "Riyadh") shown in tooltip */
  locationLabel?: string;
}

export const MaterialRow = React.memo(function MaterialRow({
  item,
  materialUnits,
  currency,
  isOwner,
  onEdit,
  onDelete,
  onDuplicate,
  onComment,
  onUpdateField,
  selected,
  onToggle,
  locationFactor = 1,
  locationLabel,
}: MaterialRowProps) {
  const { t } = useTranslation(["common", "project_materials"]);
  const { format } = useCurrencyFormatter();

  const baseTotal = calculateItemCost.material(item.quantity, item.unit_price);
  const adjustedTotal = baseTotal * locationFactor;
  const formula = locationFactor !== 1
    ? `${item.quantity} × ${format(item.unit_price, currency)} × ${locationFactor}${locationLabel ? ` (${locationLabel})` : ""} = ${format(adjustedTotal, currency)}`
    : `${item.quantity} × ${format(item.unit_price, currency)} = ${format(baseTotal, currency)}`;

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
      <TableCell className="text-start text-sm">{item.description}</TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.quantity}
            display={String(item.quantity)}
            onCommit={(v) => onUpdateField(item.id, { quantity: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("columns.quantity")} ${item.name}`}
          />
        </bdi>
      </TableCell>
      <TableCell className="text-start text-sm">
        {materialUnits.find((u) => u.value === item.unit)?.label || item.unit}
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.unit_price}
            display={format(item.unit_price, currency)}
            onCommit={(v) => onUpdateField(item.id, { unit_price: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("columns.unitPrice")} ${item.name}`}
          />
        </bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <bdi dir="ltr">{format(adjustedTotal, currency)}</bdi>
            </TooltipTrigger>
            <TooltipContent className="p-3 text-xs">
              <div className="font-semibold mb-1">{t("project_materials:formula")}</div>
              <code className="font-mono text-muted-foreground">{formula}</code>
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
              className="w-4 h-4 text-muted-foreground"
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
});
