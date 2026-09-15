"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Layers, Trash, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getIconMarginClass } from "@/lib/utils";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkMoveDialog } from "@/components/project/BulkMoveDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { safeAdd } from "@/utils/math";
import { AdditionalCostRow } from "./AdditionalCostRow";
import { AdditionalCostForm } from "./AdditionalCostForm";
import { QuickAddRow } from "./QuickAddRow";
import { MobileItemCard } from "./MobileItemCard";
import { ItemActions } from "./ItemActions";
import ProjectCsvImportDialog from "./ProjectCsvImportDialog";
import { AdditionalCostItem } from "@/types/project-items";
import { useProjectAdditionalCosts } from "@/hooks/useProjectAdditionalCosts";
import { useIsMobile } from "@/hooks/useMobile";
import {
  AdditionalCostFormValues,
  additionalCostSchema,
} from "@/types/schemas";
import DataTable, { DataTableColumn } from "@/components/ui/data-table";
import { AssemblyIntegrationRow } from "./AssemblyIntegrationRow";

const PAGE_SIZE = 50;

export function AdditionalCostsTable({
  projectId,
  additionalCosts,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  additionalCategories,
  isLoadingAdditionalCategories,
  locationFactor = 1,
}: {
  projectId: string;
  additionalCosts: AdditionalCostItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: AdditionalCostItem, itemType: string) => void;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
  locationFactor?: number;
}) {
  const { t } = useTranslation(["project_additional", "project_detail", "common"]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdditionalCostItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdditionalCostItem | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const allIds = useMemo(() => additionalCosts.map((a) => a.id), [additionalCosts]);
  const selection = useBulkSelection(allIds);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const {
    handleAddOrUpdateAdditionalCost,
    handleDuplicateAdditionalCost,
    handleDeleteAdditionalCost,
    handleUpdateAdditionalCostField,
    handleBulkDeleteAdditionalCosts,
    handleBulkMoveAdditionalCosts,
    isAddingAdditionalCost,
    isUpdatingAdditionalCost,
    isDeletingAdditionalCost,
    isBulkDeletingAdditionalCosts,
    isBulkMovingAdditionalCosts,
  } = useProjectAdditionalCosts(projectId);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const openForm = useCallback((item: AdditionalCostItem | null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: AdditionalCostFormValues) => {
      await handleAddOrUpdateAdditionalCost(data, editingItem?.id);
      closeForm();
      selection.clear();
    },
    [handleAddOrUpdateAdditionalCost, editingItem, selection, closeForm],
  );

  const grandTotal = useMemo(
    () => additionalCosts.reduce((sum, item) => safeAdd(sum, item.amount * locationFactor), 0),
    [additionalCosts, locationFactor],
  );

  const columns = useMemo<DataTableColumn<AdditionalCostItem>[]>(
    () => [
      {
        key: "category",
        label: t("columns.category"),
        align: "start",
        minWidth: "150",
        format: (value: string) =>
          additionalCategories.find((c) => c.value === value)?.label || value,
      },
      {
        key: "description",
        label: t("columns.description"),
        align: "start",
        minWidth: "200",
      },
      {
        key: "amount",
        label: t("columns.amount"),
        align: "end",
        isCurrency: true,
        minWidth: "120",
        format: (value: number) => format(value * locationFactor, currency),
        sortValue: (row) => row.amount * locationFactor,
      },
    ],
    [t, currency, format, additionalCategories, locationFactor],
  );

  const totalPages = Math.ceil(additionalCosts.length / PAGE_SIZE);

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const renderRow = useCallback(
    (item: AdditionalCostItem) => (
      <AdditionalCostRow
        key={item.id}
        item={item}
        currency={currency}
        isOwner={canEdit}
        onEdit={() => openForm(item)}
        onDelete={() => setDeleteTarget(item)}
        onDuplicate={() => handleDuplicateAdditionalCost(item)}
        onComment={(commentItem: AdditionalCostItem) => onOpenComments(commentItem, "additional")}
        onUpdateField={handleUpdateAdditionalCostField}
        selected={selection.isSelected(item.id)}
        onToggle={() => selection.toggle(item.id)}
        additionalCategories={additionalCategories}
      />
    ),
    [currency, canEdit, openForm, setDeleteTarget, handleDuplicateAdditionalCost, onOpenComments, selection, additionalCategories, handleUpdateAdditionalCostField],
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
              <Upload className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
              {t("common:importCsv")}
            </Button>
            <Button
              onClick={() => openForm(null)}
              className="h-11 text-sm"
              aria-label={t("add")}
            >
              <Plus className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
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
              key: "category",
              label: t("columns.category"),
              type: "select",
              options: additionalCategories,
              placeholder: t("columns.categoryPlaceholder"),
            },
            {
              key: "description",
              label: t("columns.description"),
              placeholder: t("columns.descriptionPlaceholder"),
            },
            {
              key: "amount",
              label: `${t("columns.amount")} (${currency})`,
              type: "number",
              placeholder: t("columns.amountPlaceholder"),
            },
          ]}
          schema={additionalCostSchema}
          buildValues={(raw) => ({
            category: raw.category,
            description: raw.description,
            amount: Number(raw.amount),
            group_id: "ungrouped",
          })}
          onSubmit={(values) =>
            handleAddOrUpdateAdditionalCost(values as AdditionalCostFormValues)
          }
          isSubmitting={isAddingAdditionalCost}
          submitLabel={t("add")}
          ariaLabel={t("add")}
        />
      )}
      {canEdit && !isFormOpen && (
        <AssemblyIntegrationRow
          itemTypes={["additional"]}
          onImport={{
            additional: async (items) => {
              for (const item of items) {
                const details = item.details as { category: string } | null;
                await handleAddOrUpdateAdditionalCost({
                  category: details?.category || "Miscellaneous",
                  description: item.description,
                  amount: item.unit_price,
                  group_id: "ungrouped",
                });
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
          <AdditionalCostForm
            editingItem={editingItem}
            onSubmit={onSubmit}
            onCancel={closeForm}
            isSubmitting={isAddingAdditionalCost || isUpdatingAdditionalCost}
            groups={groups}
            currency={currency}
            additionalCategories={additionalCategories}
            isLoadingAdditionalCategories={isLoadingAdditionalCategories}
          />
        </div>
      )}
      {isMobile ? (
        <div className="space-y-3">
          {additionalCosts.map((item) => (
            <MobileItemCard
              key={item.id}
              name={
                additionalCategories.find((c) => c.value === item.category)?.label ||
                item.category
              }
              subtitle={item.description || t("common:notSpecified")}
              total={format(item.amount, currency)}
              selected={selection.isSelected(item.id)}
              onToggle={() => selection.toggle(item.id)}
              isOwner={canEdit}
              actions={isSelectMode ? undefined : (
                <ItemActions
                  isOwner={canEdit}
                  onComment={() => onOpenComments(item, "additional")}
                  onDuplicate={() => handleDuplicateAdditionalCost(item)}
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
          {additionalCosts.length === 0 && (
            <div className="text-center h-24 text-sm text-muted-foreground">
              {t("noItems")}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={additionalCosts}
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
            selectAllLabel: t("common:selectAllAdditional"),
          }}
          ariaLabel={t("project_additional:tableLabel")}
          groupRows={{
            groups,
            getGroupId: (row) => row.group_id || undefined,
            ungroupedLabelKey: "project_detail:groups.ungrouped",
          }}
          stickyHeader={true}
          searchable
          searchPlaceholder={t("common:search")}
          getSearchText={(row) =>
            `${row.description || ""} ${row.category || ""}`
          }
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
        onConfirm={() => deleteTarget && handleDeleteAdditionalCost(deleteTarget.id)}
        itemName={
          additionalCategories.find((c) => c.value === deleteTarget?.category)?.label ||
          deleteTarget?.category
        }
        loading={isDeletingAdditionalCost}
      />
      <DeleteConfirmationDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={() =>
          handleBulkDeleteAdditionalCosts(Array.from(selection.selectedIds))
        }
        itemName={`${selection.count} items`}
        loading={isBulkDeletingAdditionalCosts}
      />
      <BulkMoveDialog
        open={showBulkMove}
        onOpenChange={setShowBulkMove}
        groups={groups}
        count={selection.count}
        loading={isBulkMovingAdditionalCosts}
        onConfirm={(groupId) =>
          handleBulkMoveAdditionalCosts(Array.from(selection.selectedIds), groupId)
        }
      />
      <ProjectCsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        itemType="additional"
        onImport={(values) =>
          handleAddOrUpdateAdditionalCost(values as AdditionalCostFormValues)
        }
      />
    </div>
  );
}