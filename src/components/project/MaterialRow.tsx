import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Copy, MessageSquare } from "lucide-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { calculateItemCost } from "@/logic/shared";
import { useTranslation } from "react-i18next";
import React from "react";
import { MaterialItem } from "@/types/project-items";

interface MaterialRowProps {
  item: MaterialItem;
  materialUnits: { value: string; label: string }[];
  currency: string;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComment: (item: MaterialItem) => void;
  selected: boolean;
  onToggle: () => void;
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
  selected,
  onToggle,
}: MaterialRowProps) {
  const { t } = useTranslation(["common", "project_materials"]);
  const { format } = useCurrencyFormatter();

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
        {item.quantity}
      </TableCell>
      <TableCell className="text-start text-sm">
        {materialUnits.find((u) => u.value === item.unit)?.label || item.unit}
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        {format(item.unit_price, currency)}
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm">
        {format(
          calculateItemCost.material(item.quantity, item.unit_price),
          currency,
        )}
      </TableCell>
      <TableCell className="text-end">
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onComment(item)}
            title={t("common:comments")}
            aria-label={`${t("common:comments")} ${item.name}`}
            className="h-11 w-11"
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
                className="h-11 w-11"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onEdit}
                title={t("common:edit")}
                aria-label={`${t("common:edit")} ${item.name}`}
                className="h-11 w-11"
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={onDelete}
                title={t("common:delete")}
                aria-label={`${t("common:delete")} ${item.name}`}
                className="h-11 w-11"
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
