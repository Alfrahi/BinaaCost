import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, MessageSquare, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { LaborItem } from "@/types/project-items";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const totalCost = item.total_cost || 0;
  const formula = `${item.number_of_workers} × ${format(item.daily_rate, currency)} × ${item.total_days} = ${format(totalCost, currency)}`;

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
        <bdi dir="ltr">{item.number_of_workers}</bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">{format(item.daily_rate, currency)}</bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">{item.total_days}</bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <bdi dir="ltr">{format(totalCost, currency)}</bdi>
            </TooltipTrigger>
            <TooltipContent className="p-3 text-xs">
              <div className="font-semibold mb-1">{t("project_labor:formula")}</div>
              <code className="font-mono text-text-secondary">{formula}</code>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
