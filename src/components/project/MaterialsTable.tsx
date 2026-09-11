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
import { calculateItemCost } from "@/logic/shared";
import { MaterialRow } from "./MaterialRow";
import { MaterialForm } from "./MaterialForm";
import { QuickAddRow } from "./QuickAddRow";
import { MobileItemCard } from "./MobileItemCard";
import { ItemActions } from "./ItemActions";
import ProjectCsvImportDialog from "./ProjectCsvImportDialog";
import { materialSchema, MaterialFormValues } from "@/types/schemas";
import { MaterialItem } from "@/types/project-items";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { useIsMobile } from "@/hooks/useMobile";
import DataTable from "@/components/ui/data-table";
import { AssemblyIntegrationRow } from "./AssemblyIntegrationRow";

const PAGE_SIZE = 50;

export function MaterialsTable({
  projectId,
  materials,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  materialUnits,
  isLoadingMaterialUnits,
  locationFactor = 1,
  locationLabel,
}: {
  projectId: string;
  materials: MaterialItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: MaterialItem, itemType: string) => void;
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
  locationFactor?: number;
  locationLabel?: string;
}) {
  const { t } = useTranslation([
    "project_materials",
    "project_detail",
    "common",
  ]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialItem | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const allIds = useMemo(() => materials.map((m) => m.id), [materials]);
  const selection = useBulkSelection(allIds);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const {
    handleAddOrUpdateMaterial,
    handleDuplicateMaterial,
    handleDeleteMaterial,
    handleBulkDeleteMaterials,
    handleBulkMoveMaterials,
    isAddingMaterial,
    isUpdatingMaterial,
    isDeletingMaterial,
    isBulkDeletingMaterials,
    isBulkMovingMaterials,
  } = useProjectMaterials(projectId);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const openForm = useCallback((item: MaterialItem | null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: MaterialFormValues) => {
      await handleAddOrUpdateMaterial(data, currency, editingItem?.id);
      closeForm();
      selection.clear();
    },
    [handleAddOrUpdateMaterial, currency, editingItem, selection, closeForm],
  );

  const grandTotal = useMemo(
    () =>
      materials.reduce(
        (sum, item) =>
          safeAdd(
            sum,
            calculateItemCost.material(item.quantity, item.unit_price) *
              locationFactor,
          ),
        0,
      ),
    [materials, locationFactor],
  );

  const columns = useMemo<DataTableColumn<MaterialItem>[]>(
    () => [
      {
        key: "name",
        label: t("columns.name"),
        align: "start",
        minWidth: "150px",
      },
      {
        key: "description",
        label: t("columns.description"),
        align: "start",
        minWidth: "200px",
      },
      {
        key: "quantity",
        label: t("columns.quantity"),
        align: "end",
        minWidth: "100px",
      },
      {
        key: "unit",
        label: t("columns.unit"),
        align: "start",
        minWidth: "80px",
        format: (value: string) =>
          materialUnits.find((u) => u.value === value)?.label || value,
      },
      {
        key: "unit_price",
        label: t("columns.unitPrice"),
        align: "end",
        isCurrency: true,
        minWidth: "120px",
        format: (value: number) => format(value, currency),
      },
      {
        key: "total",
        label: t("columns.estTotalCost"),
        align: "end",
        minWidth: "120px",
        format: (_, row: MaterialItem) =>
          format(
            calculateItemCost.material(row.quantity, row.unit_price) *
              locationFactor,
            currency,
          ),
      },
    ],
    [t, materialUnits, currency, format, locationFactor],
  );

  const totalPages = Math.ceil(materials.length / PAGE_SIZE);

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const renderRow = useCallback(
    (item: MaterialItem) => (
      <MaterialRow
        key={item.id}
        item={item}
        materialUnits={materialUnits}
        currency={currency}
        isOwner={canEdit}
        onEdit={() => openForm(item)}
        onDelete={() => setDeleteTarget(item)}
        onDuplicate={() => handleDuplicateMaterial(item)}
        onComment={(commentItem) => onOpenComments(commentItem, "material")}
        selected={selection.isSelected(item.id)}
        onToggle={() => selection.toggle(item.id)}
        locationFactor={locationFactor}
        locationLabel={locationLabel}
      />
    ),
    [materialUnits, currency, canEdit, openForm, setDeleteTarget, handleDuplicateMaterial, onOpenComments, selection, locationFactor, locationLabel],
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
              key: "name",
              label: t("columns.name"),
              placeholder: t("columns.namePlaceholder"),
            },
            {
              key: "quantity",
              label: t("columns.quantity"),
              type: "number",
              placeholder: t("columns.quantityPlaceholder"),
            },
            {
              key: "unit_price",
              label: `${t("columns.unitPrice")} (${currency})`,
              type: "number",
              placeholder: t("columns.unitPricePlaceholder"),
            },
          ]}
          schema={materialSchema}
          buildValues={(raw) => ({
            name: raw.name,
            quantity: Number(raw.quantity),
            unit: materialUnits[0]?.value || "",
            unit_price: Number(raw.unit_price),
            group_id: "ungrouped",
          })}
          onSubmit={(values) =>
            handleAddOrUpdateMaterial(values as MaterialFormValues, currency)
          }
          isSubmitting={isAddingMaterial}
          submitLabel={t("add")}
          ariaLabel={t("add")}
        />
      )}
      {canEdit && !isFormOpen && (
        <AssemblyIntegrationRow
          itemTypes={["material"]}
          onImport={{
            materials: async (items) => {
              for (const item of items) {
                await handleAddOrUpdateMaterial(
                  {
                    name: item.description,
                    description: "",
                    quantity: item.quantity,
                    unit: item.unit || "unit",
                    unit_price: item.unit_price,
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
          <MaterialForm
            defaultValues={
              editingItem
                ? {
                    name: editingItem.name,
                    description: editingItem.description || undefined,
                    quantity: editingItem.quantity,
                    unit: editingItem.unit,
                    unit_price: editingItem.unit_price,
                    group_id: editingItem.group_id || "ungrouped",
                  }
                : undefined
            }
            onSubmit={onSubmit}
            onCancel={closeForm}
            isSubmitting={isAddingMaterial || isUpdatingMaterial}
            groups={groups}
            currency={currency}
            materialUnits={materialUnits}
            isLoadingMaterialUnits={isLoadingMaterialUnits}
          />
        </div>
      )}
      {isMobile ? (
        <div className="space-y-3">
          {materials.map((item) => (
            <MobileItemCard
              key={item.id}
              name={item.name}
              subtitle={`${item.quantity} × ${format(item.unit_price, currency)}`}
              total={format(
                calculateItemCost.material(item.quantity, item.unit_price),
                currency,
              )}
              selected={selection.isSelected(item.id)}
              onToggle={() => selection.toggle(item.id)}
              isOwner={canEdit}
              actions={isSelectMode ? undefined : (
                <ItemActions
                  isOwner={canEdit}
                  onComment={() => onOpenComments(item, "material")}
                  onDuplicate={() => handleDuplicateMaterial(item)}
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
          {materials.length === 0 && (
            <div className="text-center h-24 text-sm text-muted-foreground">
              {t("noItems")}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={materials}
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
            selectAllLabel: t("common:selectAllMaterials"),
          }}
          ariaLabel={t("project_materials:tableLabel")}
          groupRows={{
            groups,
            getGroupId: (row) => row.group_id || undefined,
            ungroupedLabelKey: "project_detail:groups.ungrouped",
          }}
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
        onConfirm={() => deleteTarget && handleDeleteMaterial(deleteTarget.id)}
        itemName={deleteTarget?.name}
        loading={isDeletingMaterial}
      />
      <DeleteConfirmationDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={() =>
          handleBulkDeleteMaterials(Array.from(selection.selectedIds))
        }
        itemName={`${selection.count} items`}
        loading={isBulkDeletingMaterials}
      />
      <BulkMoveDialog
        open={showBulkMove}
        onOpenChange={setShowBulkMove}
        groups={groups}
        count={selection.count}
        loading={isBulkMovingMaterials}
        onConfirm={(groupId) =>
          handleBulkMoveMaterials(Array.from(selection.selectedIds), groupId)
        }
      />
      <ProjectCsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        itemType="materials"
        onImport={(values) =>
          handleAddOrUpdateMaterial(values as MaterialFormValues, currency)
        }
      />
    </div>
  );
}

interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "start" | "end";
  isCurrency?: boolean;
  format?: (value: any, row: T) => React.ReactNode;
  minWidth?: string;
}