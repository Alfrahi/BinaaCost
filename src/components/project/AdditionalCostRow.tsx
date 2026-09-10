"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Copy, MessageSquare } from "lucide-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { useTranslation } from "react-i18next";
import { AdditionalCostItem } from "@/types/project-items";

interface AdditionalCostRowProps {
  item: AdditionalCostItem;
  currency: string;
  isOwner: boolean;
  onEdit: (item: AdditionalCostItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: AdditionalCostItem) => void;
  onComment: (item: AdditionalCostItem) => void;
  selected: boolean;
  onToggle: () => void;
  additionalCategories: { value: string; label: string }[];
}

export function AdditionalCostRow({
  item,
  currency,
  isOwner,
  onEdit,
  onDelete,
  onDuplicate,
  onComment,
  selected,
  onToggle,
  additionalCategories,
}: AdditionalCostRowProps) {
  const { t } = useTranslation(["project_additional", "common"]);
  const { format } = useCurrencyFormatter();

  return (
    <TableRow>
      <TableCell className="w-[40px]">
        {isOwner && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`${t("common:select")} ${item.category}`}
          />
        )}
      </TableCell>
      <TableCell className="text-start text-sm min-w-[150px]">
        {additionalCategories.find((c) => c.value === item.category)?.label ||
          item.category}
      </TableCell>
      <TableCell className="text-start text-sm min-w-[200px]">
        {item.description || t("common:notSpecified")}
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm min-w-[120px]">
        {format(item.amount, currency)}
      </TableCell>
      <TableCell className="text-end min-w-[100px]">
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onComment(item)}
            title={t("common:comments")}
            aria-label={`${t("common:comments")} ${item.category}`}
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
                onClick={() => onDuplicate(item)}
                title={t("common:duplicate")}
                aria-label={`${t("common:duplicate")} ${item.category}`}
                className="h-11 w-11"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(item)}
                title={t("common:edit")}
                aria-label={`${t("common:edit")} ${item.category}`}
                className="h-11 w-11"
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(item.id)}
                title={t("common:delete")}
                aria-label={`${t("common:delete")} ${item.category}`}
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
}