import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Edit2, Trash2, MessageSquare, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { LaborItem } from "@/features/projects/project-costs/types/items";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { InlineEditableCell } from "./InlineEditableCell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

interface LaborRowProps {
  item: LaborItem;
  currency: string;
  isOwner: boolean;
  onEdit: (item: LaborItem) => void;
  onDelete: (item: LaborItem) => void;
  onDuplicate: (item: LaborItem) => void;
  onComment: (item: LaborItem) => void;
  onUpdateField: (id: string, field: Partial<LaborItem>) => void;
  selected: boolean;
  onToggle: () => void;
  /** Project-level location cost multiplier (default 1) */
  locationFactor?: number;
  /** Label for the location factor shown in formula tooltip */
  locationLabel?: string;
}

export function LaborRow({
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
  locationFactor = 1,
  locationLabel,
}: LaborRowProps) {
  const { t } = useTranslation(["project_labor", "common"]);
  const { format } = useCurrencyFormatter();

  const baseCost = item.total_cost || 0;
  const adjustedTotal = baseCost * locationFactor;
  const formula = locationFactor !== 1
    ? `${item.number_of_workers} × ${format(item.daily_rate, currency)} × ${item.total_days} × ${locationFactor}${locationLabel ? ` (${locationLabel})` : ""} = ${format(adjustedTotal, currency)}`
    : `${item.number_of_workers} × ${format(item.daily_rate, currency)} × ${item.total_days} = ${format(baseCost, currency)}`;

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
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.number_of_workers}
            display={String(item.number_of_workers)}
            onCommit={(v) => onUpdateField(item.id, { number_of_workers: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("project_labor:columns.numWorkers")} ${item.worker_type}`}
          />
        </bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.daily_rate}
            display={format(item.daily_rate, currency)}
            onCommit={(v) => onUpdateField(item.id, { daily_rate: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("project_labor:columns.dailyRate")} ${item.worker_type}`}
          />
        </bdi>
      </TableCell>
      <TableCell className="text-end tabular-nums text-sm">
        <bdi dir="ltr">
          <InlineEditableCell
            value={item.total_days}
            display={String(item.total_days)}
            onCommit={(v) => onUpdateField(item.id, { total_days: v })}
            disabled={!isOwner}
            ariaLabel={`${t("common:edit")} ${t("project_labor:columns.totalDays")} ${item.worker_type}`}
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
              <div className="font-semibold mb-1">{t("project_labor:formula")}</div>
              <code className="font-mono text-muted-foreground">{formula}</code>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-end">
        <div className="flex gap-2 justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onComment(item)}
            title={t("common:viewComments")}
            aria-label={`${t("common:viewComments")} ${item.worker_type}`}
            className="h-8 w-8"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
          </Button>
          {isOwner && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDuplicate(item)}
                title={t("common:duplicate")}
                aria-label={`${t("common:duplicate")} ${item.worker_type}`}
                className="h-8 w-8"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(item)}
                title={t("common:edit")}
                aria-label={`${t("common:edit")} ${item.worker_type}`}
                className="h-8 w-8"
              >
                <Edit2 className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                onClick={() => onDelete(item)}
                title={t("common:delete")}
                aria-label={`${t("common:delete")} ${item.worker_type}`}
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
