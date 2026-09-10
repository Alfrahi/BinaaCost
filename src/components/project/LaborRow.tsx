import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, MessageSquare, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { LaborItem } from "@/types/project-items";
import { Checkbox } from "@/components/ui/checkbox";

interface LaborRowProps {
  item: LaborItem;
  currency: string;
  isOwner: boolean;
  onEdit: (item: LaborItem) => void;
  onDelete: (item: LaborItem) => void;
  onDuplicate: (item: LaborItem) => void;
  onComment: (item: LaborItem) => void;
  selected: boolean;
  onToggle: () => void;
}

export function LaborRow({
  item,
  currency,
  isOwner,
  onEdit,
  onDelete,
  onDuplicate,
  onComment,
  selected,
  onToggle,
}: LaborRowProps) {
  const { t } = useTranslation(["project_labor", "common"]);
  const { format } = useCurrencyFormatter();

  return (
    <TableRow>
      {isOwner && (
        <TableCell className="w-[40px] px-3 py-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`${t("common:select")} ${item.worker_type}`}
          />
        </TableCell>
      )}
      <TableCell className="text-start font-medium text-sm">
        {item.worker_type}
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        {item.number_of_workers}
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        {format(item.daily_rate, currency)}
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        {item.total_days}
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm">
        {format(item.total_cost || 0, currency)}
      </TableCell>
      <TableCell className="text-end">
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onComment(item)}
            title={t("common:viewComments")}
            aria-label={`${t("common:viewComments")} ${item.worker_type}`}
            className="h-11 w-11"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          {isOwner && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDuplicate(item)}
                title={t("common:duplicate")}
                aria-label={`${t("common:duplicate")} ${item.worker_type}`}
                className="h-11 w-11"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(item)}
                title={t("common:edit")}
                aria-label={`${t("common:edit")} ${item.worker_type}`}
                className="h-11 w-11"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-11 w-11"
                onClick={() => onDelete(item)}
                title={t("common:delete")}
                aria-label={`${t("common:delete")} ${item.worker_type}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
