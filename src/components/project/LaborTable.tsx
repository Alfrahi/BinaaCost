import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Layers, Trash, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkMoveDialog } from "@/components/project/BulkMoveDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { safeAdd } from "@/utils/math";
import { PaginationControls } from "@/components/PaginationControls";
import { LaborRow } from "./LaborRow";
import { LaborForm } from "./LaborForm";
import { QuickAddRow } from "./QuickAddRow";
import { MobileItemCard } from "./MobileItemCard";
import { ItemActions } from "./ItemActions";
import ProjectCsvImportDialog from "./ProjectCsvImportDialog";
import { laborSchema, LaborFormValues } from "@/types/schemas";
import { LaborItem } from "@/types/project-items";
import { useProjectLabor } from "@/hooks/useProjectLabor";
import { useIsMobile } from "@/hooks/useMobile";

const PAGE_SIZE = 50;

export function LaborTable({
  projectId,
  labor,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
}: {
  projectId: string;
  labor: LaborItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: LaborItem, itemType: string) => void;
}) {
  const { t } = useTranslation(["project_labor", "project_detail", "common"]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LaborItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LaborItem | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const allIds = useMemo(() => labor.map((l) => l.id), [labor]);
  const selection = useBulkSelection(allIds);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const {
    handleAddOrUpdateLabor,
    handleDuplicateLabor,
    handleDeleteLabor,
    handleBulkDeleteLabor,
    handleBulkMoveLabor,
    isAddingLabor,
    isUpdatingLabor,
    isDeletingLabor,
    isBulkDeletingLabor,
    isBulkMovingLabor,
  } = useProjectLabor(projectId);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const openForm = useCallback((item: LaborItem | null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: LaborFormValues) => {
      await handleAddOrUpdateLabor(data, currency, editingItem?.id);
      closeForm();
      selection.clear();
    },
    [handleAddOrUpdateLabor, currency, editingItem, selection, closeForm],
  );

  const grandTotal = useMemo(
    () => labor.reduce((sum, item) => safeAdd(sum, item.total_cost), 0),
    [labor],
  );

  const displayRows = useMemo(() => {
    const rows: { type: "header" | "item"; data: any }[] = [];

    const ungrouped = labor.filter((m) => !m.group_id);
    if (ungrouped.length > 0) {
      if (groups.length > 0) {
        rows.push({
          type: "header",
          data: { id: "ungrouped", name: t("project_detail:groups.ungrouped") },
        });
      }
      ungrouped.forEach((item) => rows.push({ type: "item", data: item }));
    }

    groups.forEach((group) => {
      const groupItems = labor.filter((m) => m.group_id === group.id);
      if (groupItems.length > 0) {
        rows.push({ type: "header", data: group });
        groupItems.forEach((item) => rows.push({ type: "item", data: item }));
      }
    });

    return rows;
  }, [labor, groups, t]);

  const totalPages = Math.ceil(displayRows.length / PAGE_SIZE);

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return displayRows.slice(start, start + PAGE_SIZE);
  }, [displayRows, currentPage]);

  const headerClass =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10";
  const footerClass = "font-bold text-foreground bg-muted h-10";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {canEdit && !isFormOpen && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCsvImport(true)}
              className="h-11 text-sm"
              aria-label={t("common:importCsv")}
            >
              <Upload className="w-4 h-4 me-2" aria-hidden="true" />
              {t("common:importCsv")}
            </Button>
            <Button
              onClick={() => openForm(null)}
              className="h-11 text-sm"
              aria-label={t("add")}
            >
              <Plus className="w-4 h-4 me-2" aria-hidden="true" />
              {t("add")}
            </Button>
          </div>
        )}
      </div>
      {canEdit && !isFormOpen && (
        <QuickAddRow
          className="mb-4"
          fields={[
            {
              key: "worker_type",
              label: t("columns.workerType"),
              placeholder: t("columns.workerTypePlaceholder"),
            },
            {
              key: "number_of_workers",
              label: t("columns.numWorkers"),
              type: "number",
              placeholder: t("columns.numWorkersPlaceholder"),
            },
            {
              key: "daily_rate",
              label: `${t("columns.dailyRate")} (${currency})`,
              type: "number",
              placeholder: t("columns.dailyRatePlaceholder"),
            },
          ]}
          schema={laborSchema}
          buildValues={(raw) => ({
            worker_type: raw.worker_type,
            number_of_workers: Number(raw.number_of_workers),
            daily_rate: Number(raw.daily_rate),
            total_days: 1,
            group_id: "ungrouped",
          })}
          onSubmit={(values) =>
            handleAddOrUpdateLabor(values as LaborFormValues, currency)
          }
          isSubmitting={isAddingLabor}
          submitLabel={t("add")}
          ariaLabel={t("add")}
        />
      )}
      {isFormOpen && (
        <Card className="p-4 mb-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? t("edit") : t("add")}
          </h3>
          <LaborForm
            defaultValues={
              editingItem
                ? {
                    worker_type: editingItem.worker_type,
                    number_of_workers: editingItem.number_of_workers,
                    daily_rate: editingItem.daily_rate,
                    total_days: editingItem.total_days,
                    description: editingItem.description,
                    group_id: editingItem.group_id || "ungrouped",
                  }
                : undefined
            }
            onSubmit={onSubmit}
            onCancel={closeForm}
            isSubmitting={isAddingLabor || isUpdatingLabor}
            groups={groups}
            currency={currency}
          />
        </Card>
      )}
      {isMobile ? (
        <div className="space-y-3">
          {paginatedRows.map((row) => {
            if (row.type === "header") {
              return (
                <div
                  key={`header-${row.data.id}`}
                  className="font-semibold text-sm text-muted-foreground pt-2"
                >
                  {row.data.name}
                </div>
              );
            }
            const item = row.data;
            return (
              <MobileItemCard
                key={item.id}
                name={item.worker_type}
                subtitle={`${item.number_of_workers} × ${format(
                  item.daily_rate,
                  currency,
                )} × ${item.total_days}`}
                total={format(item.total_cost || 0, currency)}
                selected={selection.isSelected(item.id)}
                onToggle={() => selection.toggle(item.id)}
                isOwner={canEdit}
                actions={isSelectMode ? undefined : (
                  <ItemActions
                    isOwner={canEdit}
                    onComment={() => onOpenComments(item, "labor")}
                    onDuplicate={() => handleDuplicateLabor(item)}
                    onEdit={() => openForm(item)}
                    onDelete={() => setDeleteTarget(item)}
                    commentLabel={t("common:viewComments")}
                    duplicateLabel={t("common:duplicate")}
                    editLabel={t("common:edit")}
                    deleteLabel={t("common:delete")}
                  />
                )}
              />
            );
          })}
          {labor.length === 0 && (
            <div className="text-center h-24 text-sm text-muted-foreground">
              {t("noItems")}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && (
                  <TableHead className={`w-[40px] ${headerClass}`}>
                    <Checkbox
                      checked={selection.allSelected}
                      onCheckedChange={selection.toggleAll}
                      aria-label={t("common:all")}
                    />
                  </TableHead>
                )}
                <TableHead className={`text-start ${headerClass} min-w-[150px]`}>
                  {t("columns.workerType")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                  {t("columns.numWorkers")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                  {t("columns.dailyRate")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[100px]`}>
                  {t("columns.totalDays")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                  {t("columns.estTotalCost")}
                </TableHead>
                {canEdit && (
                  <TableHead className={`text-end ${headerClass} min-w-[100px]`}>
                    {t("common:actions")}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row) => {
                if (row.type === "header") {
                  return (
                    <TableRow
                      key={`header-${row.data.id}`}
                      className="bg-muted hover:bg-muted"
                    >
                      <TableCell
                        colSpan={canEdit ? 7 : 6}
                        className="font-semibold text-foreground text-sm"
                      >
                        {row.data.name}
                      </TableCell>
                    </TableRow>
                  );
                } else {
                  const item = row.data;
                  return (
                    <LaborRow
                      key={item.id}
                      item={item}
                      currency={currency}
                      isOwner={canEdit}
                      onEdit={() => openForm(item)}
                      onDelete={() => setDeleteTarget(item)}
                      onDuplicate={() => handleDuplicateLabor(item)}
                      onComment={(commentItem) =>
                        onOpenComments(commentItem, "labor")
                      }
                      selected={selection.isSelected(item.id)}
                      onToggle={() => selection.toggle(item.id)}
                    />
                  );
                }
              })}
              {labor.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 7 : 6}
                    className="text-center h-24 text-sm"
                  >
                    {t("noItems")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 5 : 4}
                  className={`text-end ${footerClass} text-sm`}
                >
                  {t("columns.grandTotal")}
                </TableCell>
                <TableCell
                  className={`text-end tabular-nums ${footerClass} text-sm`}
                >
                  {format(grandTotal, currency)}
                </TableCell>
                <TableCell className={footerClass} />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      <BulkActionBar count={selection.count} onClear={selection.clear} isSelectMode={isSelectMode} onToggleSelectMode={() => setIsSelectMode(!isSelectMode)}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowBulkMove(true)}
          className="flex items-center gap-2 text-sm"
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
          {t("project_detail:groups.assignGroup")}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowBulkDelete(true)}
          className="flex items-center gap-2 text-sm"
        >
          <Trash className="w-4 h-4" aria-hidden="true" />
          {t("common:delete")}
        </Button>
      </BulkActionBar>
      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDeleteLabor(deleteTarget.id)}
        itemName={deleteTarget?.worker_type}
        loading={isDeletingLabor}
      />
      <DeleteConfirmationDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={() =>
          handleBulkDeleteLabor(Array.from(selection.selectedIds))
        }
        itemName={`${selection.count} items`}
        loading={isBulkDeletingLabor}
      />
      <BulkMoveDialog
        open={showBulkMove}
        onOpenChange={setShowBulkMove}
        groups={groups}
        count={selection.count}
        loading={isBulkMovingLabor}
        onConfirm={(groupId) =>
          handleBulkMoveLabor(Array.from(selection.selectedIds), groupId)
        }
      />
      <ProjectCsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        itemType="labor"
        onImport={(values) =>
          handleAddOrUpdateLabor(values as LaborFormValues, currency)
        }
      />
    </div>
  );
}
