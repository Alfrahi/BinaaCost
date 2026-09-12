"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Layers, Trash, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkMoveDialog } from "@/components/project/BulkMoveDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { safeAdd } from "@/utils/math";
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
import DataTable, { DataTableColumn } from "@/components/ui/data-table";
import { AssemblyIntegrationRow } from "./AssemblyIntegrationRow";

const PAGE_SIZE = 50;

export function LaborTable({
  projectId,
  labor,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  locationFactor = 1,
  locationLabel,
}: {
  projectId: string;
  labor: LaborItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: LaborItem, itemType: string) => void;
  locationFactor?: number;
  locationLabel?: string;
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
    () =>
      labor
        .reduce(
          (sum, item) => safeAdd(sum, (item.total_cost || 0) * locationFactor),
          0,
        ),
    [labor, locationFactor],
  );

  const columns = useMemo<DataTableColumn<LaborItem>[]>(
    () => [
      {
        key: "worker_type",
        label: t("columns.workerType"),
        align: "start",
        minWidth: "150",
      },
      {
        key: "number_of_workers",
        label: t("columns.numWorkers"),
        align: "end",
        minWidth: "100",
      },
      {
        key: "daily_rate",
        label: t("columns.dailyRate"),
        align: "end",
        isCurrency: true,
        minWidth: "120",
        format: (value: number) => format(value, currency),
      },
      {
        key: "total_days",
        label: t("columns.totalDays"),
        align: "end",
        minWidth: "100",
      },
      {
        key: "total",
        label: t("columns.estTotalCost"),
        align: "end",
        minWidth: "120",
        format: (_, row: LaborItem) =>
          format((row.total_cost || 0) * locationFactor, currency),
        sortValue: (row) => (row.total_cost || 0) * locationFactor,
      },
    ],
    [t, currency, format, locationFactor],
  );

  const totalPages = Math.ceil(labor.length / PAGE_SIZE);

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const renderRow = useCallback(
    (item: LaborItem) => (
      <LaborRow
        key={item.id}
        item={item}
        currency={currency}
        isOwner={canEdit}
        onEdit={() => openForm(item)}
        onDelete={() => setDeleteTarget(item)}
        onDuplicate={() => handleDuplicateLabor(item)}
        onComment={(commentItem) => onOpenComments(commentItem, "labor")}
        selected={selection.isSelected(item.id)}
        onToggle={() => selection.toggle(item.id)}
        locationFactor={locationFactor}
        locationLabel={locationLabel}
      />
    ),
    [currency, canEdit, openForm, setDeleteTarget, handleDuplicateLabor, onOpenComments, selection, locationFactor, locationLabel],
  );

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
            {
              key: "total_days",
              label: t("columns.totalDays"),
              type: "number",
              placeholder: t("columns.totalDaysPlaceholder"),
            },
          ]}
          schema={laborSchema}
          buildValues={(raw) => ({
            worker_type: raw.worker_type,
            number_of_workers: Number(raw.number_of_workers),
            daily_rate: Number(raw.daily_rate),
            total_days: Number(raw.total_days),
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
      {canEdit && !isFormOpen && (
        <AssemblyIntegrationRow
          itemTypes={["labor"]}
          onImport={{
            labor: async (items) => {
              for (const item of items) {
                const details = item.details as { total_days: number } | null;
                await handleAddOrUpdateLabor(
                  {
                    worker_type: item.description,
                    number_of_workers: item.quantity,
                    daily_rate: item.unit_price,
                    total_days: details?.total_days ?? 1,
                    group_id: "ungrouped",
                  },
                  currency,
                );
              }
            },
          }}
        />
      )}
      {isFormOpen && (
        <div className="p-4 border rounded bg-card mb-4">
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
                    description: editingItem.description || undefined,
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
        </div>
      )}
      {isMobile ? (
        <div className="space-y-3">
          {labor.map((item) => (
            <MobileItemCard
              key={item.id}
              name={item.worker_type}
              subtitle={`${item.number_of_workers} × ${format(item.daily_rate, currency)} × ${item.total_days}`}
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
                  commentLabel={t("common:comments")}
                  duplicateLabel={t("common:duplicate")}
                  editLabel={t("common:edit")}
                  deleteLabel={t("common:delete")}
                />
              )}
            />
          ))}
          {labor.length === 0 && (
            <div className="text-center h-24 text-sm text-muted-foreground">
              {t("noItems")}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={labor}
          getRowKey={(row) => row.id}
          renderRow={renderRow}
          grandTotal={format(grandTotal, currency)}
          grandTotalLabel={t("columns.grandTotal")}
          grandTotalColSpan={columns.length - 1}
          emptyMessageKey="noItems"
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
            pageSize: PAGE_SIZE,
          }}
          selection={{
            selectedIds: selection.selectedIds,
            allSelected: selection.allSelected,
            onToggle: selection.toggle,
            onToggleAll: selection.toggleAll,
            selectAllLabel: t("common:selectAllLabor"),
          }}
          ariaLabel={t("project_labor:tableLabel")}
          groupRows={{
            groups,
            getGroupId: (row) => row.group_id || undefined,
            ungroupedLabelKey: "project_detail:groups.ungrouped",
          }}
          stickyHeader={true}
          searchable
          searchPlaceholder={t("common:search")}
          getSearchText={(row) => `${row.worker_type} ${row.description || ""}`}
          sortable
        />
      )}
      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        isSelectMode={isSelectMode}
        onToggleSelectMode={() => setIsSelectMode(!isSelectMode)}
      >
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