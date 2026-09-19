

import { memo } from "react";
import { TableRow, TableCell } from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Edit2, Trash2, Copy, MessageSquare } from "lucide-react";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { useTranslation } from "react-i18next";
import { AdditionalCostItem } from "@/features/projects/project-costs/types/items";
import { InlineEditableCell } from "./InlineEditableCell";

interface AdditionalCostRowProps {
  item: AdditionalCostItem;
  currency: string;
  isOwner: boolean;
  onEdit: (item: AdditionalCostItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: AdditionalCostItem) => void;
  onComment: (item: AdditionalCostItem) => void;
  onUpdateField: (id: string, field: Partial<AdditionalCostItem>) => void;
  selected: boolean;
  onToggle: () => void;
  additionalCategories: { value: string; label: string }[];
  /** Project-level location cost multiplier (default 1) */
  locationFactor?: number;
}

export const AdditionalCostRow = memo(function AdditionalCostRow({
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
  additionalCategories,
  locationFactor = 1,
}: AdditionalCostRowProps) {
  const { t } = useTranslation(["project_additional", "common"]);
  const { format } = useCurrencyFormatter();

  const adjustedAmount = item.amount * locationFactor;

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
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.amount}
            display={format(adjustedAmount, currency)}
            onCommit={(v) => onUpdateField(item.id, { amount: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("project_additional:columns.amount")} ${item.category}`}
          />
        </bdi>
      </TableCell>
      <TableCell className="text-end min-w-[100px]">
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onComment(item)}
            title={t("common:comments")}
            aria-label={`${t("common:comments")} ${item.category}`}
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
                onClick={() => onDuplicate(item)}
                title={t("common:duplicate")}
                aria-label={`${t("common:duplicate")} ${item.category}`}
                className="h-8 w-8"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(item)}
                title={t("common:edit")}
                aria-label={`${t("common:edit")} ${item.category}`}
                className="h-8 w-8"
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(item.id)}
                title={t("common:delete")}
                aria-label={`${t("common:delete")} ${item.category}`}
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