"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Layers, Trash, Upload } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import { BulkMoveDialog } from "@/features/projects/project-costs/components/BulkMoveDialog";
import { BulkActionBar } from "@/shared/components/BulkActionBar";
import { safeAdd } from "@/shared/lib/math";
import { QuickAddRow, QuickAddField } from "./QuickAddRow";
import { MobileItemCard } from "./MobileItemCard";
import { ItemActions } from "./ItemActions";
import ProjectCsvImportDialog from "./ProjectCsvImportDialog";
import { useIsMobile } from "@/shared/hooks/useMobile";
import DataTable, { DataTableColumn } from "@/shared/components/ui/data-table";
import {
  AssemblyIntegrationRow,
  ImportItemOverrides,
} from "./AssemblyIntegrationRow";
import { EntityCrud } from "@/shared/hooks/useEntityCrud";

const PAGE_SIZE = 50;

export type EntityItemType = "material" | "labor" | "equipment" | "additional";

export interface EntityTableConfig<T> {
  /** Translated heading shown above the table. */
  title: string;
  /** Translated "add" button label. */
  addLabel: string;
  /** Item type passed to `onOpenComments` (e.g. "material"). */
  itemType: EntityItemType;
  columns: DataTableColumn<T>[];
  getSearchText: (row: T) => string;
  ariaLabel: string;
  selectAllLabel: string;
  emptyMessage: string;
  grandTotalLabel: string;
  /** Compute a single row's total (already includes location factor). */
  calculateTotal: (item: T) => number;
  /** Human-readable name for the single-delete confirmation. */
  getDeleteName: (item: T) => string;
  quickAdd: {
    fields: QuickAddField[];
    schema: any;
    buildValues: (raw: Record<string, string>) => any;
  };
  assemblyImport: {
    itemTypes: EntityItemType[];
    onImport: ImportItemOverrides;
  };
  csvImport: {
    itemType: any;
    onImport: (values: any) => Promise<void>;
  };
  renderForm: (props: {
    editingItem: T | null;
    onSubmit: (values: any) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    groups: any[];
    currency: string;
  }) => React.ReactNode;
  renderRow: (
    item: T,
    rowProps: {
      canEdit: boolean;
      currency: string;
      onEdit: () => void;
      onDelete: () => void;
      onDuplicate: () => void;
      onComment: () => void;
      onUpdateField: (id: string, field: Partial<T>) => void;
      selected: boolean;
      onToggle: () => void;
      locationFactor: number;
      locationLabel?: string;
    },
  ) => React.ReactNode;
  getMobileName: (item: T) => string;
  getMobileSubtitle: (item: T) => string;
  getMobileTotal: (item: T) => string;
}

interface EntityTableProps<T> {
  items: T[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: T, itemType: string) => void;
  locationFactor?: number;
  locationLabel?: string;
  crud: EntityCrud<T>;
  config: EntityTableConfig<T>;
}

/**
 * Shared scaffolding for a project line-item table (materials, labor,
 * equipment, additional costs): header actions, quick-add, assembly import,
 * form, mobile/desktop switch, bulk actions, delete/move dialogs and CSV
 * import. Entity-specific behaviour is supplied via `config`.
 */
export function EntityTable<T>({
  items,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  locationFactor = 1,
  locationLabel,
  crud,
  config,
}: EntityTableProps<T>) {
  const { t } = useTranslation(["common", "project_detail"]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const allIds = useMemo(() => items.map((i) => (i as any).id), [items]);
  const selection = useBulkSelection(allIds);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const openForm = useCallback((item: T | null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: any) => {
      await crud.handleAddOrUpdate(data, currency, (editingItem as any)?.id);
      closeForm();
      selection.clear();
    },
    [crud, currency, editingItem, selection, closeForm],
  );

  const grandTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => safeAdd(sum, config.calculateTotal(item)),
        0,
      ),
    [items, config],
  );

  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const renderRow = useCallback(
    (item: T) =>
      config.renderRow(item, {
        canEdit,
        currency,
        onEdit: () => openForm(item),
        onDelete: () => setDeleteTarget(item),
        onDuplicate: () => crud.handleDuplicate(item),
        onComment: () => onOpenComments(item, config.itemType),
        onUpdateField: crud.handleUpdateField,
        selected: selection.isSelected((item as any).id),
        onToggle: () => selection.toggle((item as any).id),
        locationFactor,
        locationLabel,
      }),
    [
      config,
      canEdit,
      currency,
      openForm,
      setDeleteTarget,
      crud,
      onOpenComments,
      selection,
      locationFactor,
      locationLabel,
    ],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <Heading level={3}>{config.title}</Heading>
        {canEdit && !isFormOpen && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCsvImport(true)}
              className="h-11 text-sm"
              aria-label={t("common:importCsv")}
            >
              <Upload
                className={cn("w-4 h-4", getIconMarginClass())}
                aria-hidden="true"
              />
              {t("common:importCsv")}
            </Button>
            <Button
              onClick={() => openForm(null)}
              className="h-11 text-sm"
              aria-label={config.addLabel}
            >
              <Plus
                className={cn("w-4 h-4", getIconMarginClass())}
                aria-hidden="true"
              />
              {config.addLabel}
            </Button>
          </div>
        )}
      </div>
      {canEdit && !isFormOpen && (
        <QuickAddRow
          className="mb-4"
          fields={config.quickAdd.fields}
          schema={config.quickAdd.schema}
          buildValues={config.quickAdd.buildValues}
          onSubmit={(values) => crud.handleAddOrUpdate(values, currency)}
          isSubmitting={crud.isAdding}
          submitLabel={config.addLabel}
          ariaLabel={config.addLabel}
        />
      )}
      {canEdit && !isFormOpen && (
        <AssemblyIntegrationRow
          itemTypes={config.assemblyImport.itemTypes}
          onImport={config.assemblyImport.onImport}
        />
      )}
      {isFormOpen && (
        <div className="p-4 border rounded-sm bg-card mb-4">
          <Heading level={3} className="mb-4">
            {editingItem ? t("common:edit") : config.addLabel}
          </Heading>
          {config.renderForm({
            editingItem,
            onSubmit,
            onCancel: closeForm,
            isSubmitting: crud.isAdding || crud.isUpdating,
            groups,
            currency,
          })}
        </div>
      )}
      {isMobile ? (
        <div className="space-y-3">
          {items.map((item) => (
            <MobileItemCard
              key={(item as any).id}
              name={config.getMobileName(item)}
              subtitle={config.getMobileSubtitle(item)}
              total={config.getMobileTotal(item)}
              selected={selection.isSelected((item as any).id)}
              onToggle={() => selection.toggle((item as any).id)}
              isOwner={canEdit}
              actions={
                isSelectMode ? undefined : (
                  <ItemActions
                    isOwner={canEdit}
                    onComment={() => onOpenComments(item, config.itemType)}
                    onDuplicate={() => crud.handleDuplicate(item)}
                    onEdit={() => openForm(item)}
                    onDelete={() => setDeleteTarget(item)}
                    commentLabel={t("common:comments")}
                    duplicateLabel={t("common:duplicate")}
                    editLabel={t("common:edit")}
                    deleteLabel={t("common:delete")}
                  />
                )
              }
            />
          ))}
          {items.length === 0 && (
            <div className="text-center h-24 text-sm text-muted-foreground">
              {config.emptyMessage}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={config.columns}
          data={items}
          getRowKey={(row) => (row as any).id}
          renderRow={renderRow}
          grandTotal={format(grandTotal, currency)}
          grandTotalLabel={config.grandTotalLabel}
          grandTotalColSpan={config.columns.length - 1}
          emptyMessage={config.emptyMessage}
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
            selectAllLabel: config.selectAllLabel,
          }}
          ariaLabel={config.ariaLabel}
          groupRows={{
            groups,
            getGroupId: (row) => (row as any).group_id || undefined,
            ungroupedLabelKey: "project_detail:groups.ungrouped",
          }}
          stickyHeader={true}
          searchable
          searchPlaceholder={t("common:search")}
          getSearchText={config.getSearchText}
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
        onConfirm={() =>
          deleteTarget && crud.handleDelete((deleteTarget as any).id)
        }
        itemName={deleteTarget ? config.getDeleteName(deleteTarget) : undefined}
        loading={crud.isDeleting}
      />
      <DeleteConfirmationDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={() =>
          crud.handleBulkDelete(Array.from(selection.selectedIds))
        }
        itemName={t("common:item", { count: selection.count })}
        loading={crud.isBulkDeleting}
      />
      <BulkMoveDialog
        open={showBulkMove}
        onOpenChange={setShowBulkMove}
        groups={groups}
        count={selection.count}
        loading={crud.isBulkMoving}
        onConfirm={(groupId) =>
          crud.handleBulkMove(Array.from(selection.selectedIds), groupId)
        }
      />
      <ProjectCsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        itemType={config.csvImport.itemType}
        onImport={config.csvImport.onImport}
      />
    </div>
  );
}