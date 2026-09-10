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
import { EquipmentRow } from "./EquipmentRow";
import { EquipmentForm } from "./EquipmentForm";
import { QuickAddRow } from "./QuickAddRow";
import { MobileItemCard } from "./MobileItemCard";
import { ItemActions } from "./ItemActions";
import ProjectCsvImportDialog from "./ProjectCsvImportDialog";
import { equipmentSchema, EquipmentFormValues } from "@/types/schemas";
import { EquipmentItem } from "@/types/project-items";
import { useProjectEquipment } from "@/hooks/useProjectEquipment";
import { useIsMobile } from "@/hooks/useMobile";
import DataTable from "@/components/ui/data-table";

const PAGE_SIZE = 50;

export function EquipmentTable({
  projectId,
  equipment,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  rentalOptions,
  isLoadingRentalOptions,
  periodUnits,
  isLoadingPeriodUnits,
}: {
  projectId: string;
  equipment: EquipmentItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: EquipmentItem, itemType: string) => void;
  rentalOptions: { value: string; label: string }[];
  isLoadingRentalOptions: boolean;
  periodUnits: { value: string; label: string }[];
  isLoadingPeriodUnits: boolean;
}) {
  const { t } = useTranslation([
    "project_equipment",
    "project_detail",
    "common",
  ]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const allIds = useMemo(() => equipment.map((e) => e.id), [equipment]);
  const selection = useBulkSelection(allIds);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const {
    handleAddOrUpdateEquipment,
    handleDuplicateEquipment,
    handleDeleteEquipment,
    handleBulkDeleteEquipment,
    handleBulkMoveEquipment,
    isAddingEquipment,
    isUpdatingEquipment,
    isDeletingEquipment,
    isBulkDeletingEquipment,
    isBulkMovingEquipment,
  } = useProjectEquipment(projectId);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  const openForm = useCallback((item: EquipmentItem | null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (data: EquipmentFormValues) => {
      await handleAddOrUpdateEquipment(data, currency, editingItem?.id);
      closeForm();
      selection.clear();
    },
    [handleAddOrUpdateEquipment, currency, editingItem, selection, closeForm],
  );

  const grandTotal = useMemo(
    () =>
      equipment.reduce(
        (sum, item) =>
          safeAdd(
            sum,
            calculateItemCost.equipment({
              quantity: item.quantity,
              costPerPeriod: item.cost_per_period,
              usageDuration: item.usage_duration,
              maintenanceCost: item.maintenance_cost,
              fuelCost: item.fuel_cost,
            }).totalCost,
          ),
        0,
      ),
    [equipment],
  );

  const columns = useMemo<DataTableColumn<EquipmentItem>[]>(
    () => [
      {
        key: "name",
        label: t("columns.name"),
        align: "start",
        minWidth: "150px",
      },
      {
        key: "type",
        label: t("columns.type"),
        align: "start",
        minWidth: "100px",
      },
      {
        key: "rental_or_purchase",
        label: t("columns.rentalPurchase"),
        align: "start",
        minWidth: "120px",
        format: (value: string) =>
          rentalOptions.find((opt) => opt.value === value)?.label || value,
      },
      {
        key: "quantity",
        label: t("columns.quantity"),
        align: "end",
        minWidth: "100px",
      },
      {
        key: "cost_per_period",
        label: t("columns.costPerPeriod"),
        align: "end",
        isCurrency: true,
        minWidth: "120px",
        format: (value: number) =>
          format(value, currency) +
          (value &&
            `/${t(periodUnits.find((u) => u.value === "day")?.value || "day", { defaultValue: "day" })}`),
      },
      {
        key: "period_unit",
        label: t("columns.periodUnit"),
        align: "start",
        minWidth: "100px",
        format: (value: string) =>
          periodUnits.find((u) => u.value === value)?.label || value,
      },
      {
        key: "usage_duration",
        label: t("columns.usageDuration"),
        align: "end",
        minWidth: "100px",
      },
      {
        key: "maintenance_cost",
        label: t("columns.maintenance"),
        align: "end",
        isCurrency: true,
        minWidth: "100px",
        format: (value: number) => format(value, currency),
      },
      {
        key: "fuel_cost",
        label: t("columns.fuel"),
        align: "end",
        isCurrency: true,
        minWidth: "100px",
        format: (value: number) => format(value, currency),
      },
      {
        key: "total",
        label: t("columns.estTotalCost"),
        align: "end",
        minWidth: "120px",
        format: (_, row: EquipmentItem) =>
          format(
            calculateItemCost.equipment({
              quantity: row.quantity,
              costPerPeriod: row.cost_per_period,
              usageDuration: row.usage_duration,
              maintenanceCost: row.maintenance_cost,
              fuelCost: row.fuel_cost,
            }).totalCost,
            currency,
          ),
      },
    ],
    [t, currency, format, rentalOptions, periodUnits],
  );

  const totalPages = Math.ceil(equipment.length / PAGE_SIZE);

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const renderRow = useCallback(
    (item: EquipmentItem) => (
      <EquipmentRow
        key={item.id}
        item={item}
        currency={currency}
        isOwner={canEdit}
        onEdit={() => openForm(item)}
        onDelete={() => setDeleteTarget(item)}
        onDuplicate={() => handleDuplicateEquipment(item)}
        onComment={(commentItem) => onOpenComments(commentItem, "equipment")}
        selected={selection.isSelected(item.id)}
        onToggle={() => selection.toggle(item.id)}
        rentalOptions={rentalOptions}
      />
    ),
    [
      currency,
      canEdit,
      openForm,
      setDeleteTarget,
      handleDuplicateEquipment,
      onOpenComments,
      selection,
      rentalOptions,
    ],
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
              key: "type",
              label: t("columns.type"),
              placeholder: t("columns.typePlaceholder"),
            },
            {
              key: "rental_or_purchase",
              label: t("columns.rentalPurchase"),
              type: "select",
              options: rentalOptions,
              placeholder: t("columns.rentalPurchasePlaceholder"),
            },
            {
              key: "quantity",
              label: t("columns.quantity"),
              type: "number",
              placeholder: t("columns.quantityPlaceholder"),
            },
            {
              key: "cost_per_period",
              label: `${t("columns.costPerPeriod")} (${currency})`,
              type: "number",
              placeholder: t("columns.costPerPeriodPlaceholder"),
            },
            {
              key: "period_unit",
              label: t("columns.periodUnit"),
              type: "select",
              options: periodUnits,
              placeholder: t("columns.periodUnitPlaceholder"),
            },
            {
              key: "usage_duration",
              label: t("columns.usageDuration"),
              type: "number",
              placeholder: t("columns.usageDurationPlaceholder"),
            },
            {
              key: "maintenance_cost",
              label: t("columns.maintenance"),
              type: "number",
              placeholder: t("columns.maintenancePlaceholder"),
            },
            {
              key: "fuel_cost",
              label: t("columns.fuel"),
              type: "number",
              placeholder: t("columns.fuelPlaceholder"),
            },
          ]}
          schema={equipmentSchema}
          buildValues={(raw) => ({
            name: raw.name,
            type: raw.type,
            rental_or_purchase: raw.rental_or_purchase,
            quantity: Number(raw.quantity),
            cost_per_period: Number(raw.cost_per_period),
            period_unit: raw.period_unit,
            usage_duration: Number(raw.usage_duration),
            maintenance_cost: Number(raw.maintenance_cost || 0),
            fuel_cost: Number(raw.fuel_cost || 0),
            group_id: "ungrouped",
          })}
          onSubmit={(values) =>
            handleAddOrUpdateEquipment(values as EquipmentFormValues, currency)
          }
          isSubmitting={isAddingEquipment}
          submitLabel={t("add")}
          ariaLabel={t("add")}
        />
      )}
      {isFormOpen && (
        <div className="p-4 border rounded bg-card mb-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? t("edit") : t("add")}
          </h3>
          <EquipmentForm
            defaultValues={
              editingItem
                ? {
                    name: editingItem.name,
                    rental_or_purchase: editingItem.rental_or_purchase,
                    quantity: editingItem.quantity,
                    cost_per_period: editingItem.cost_per_period,
                    period_unit: editingItem.period_unit,
                    usage_duration: editingItem.usage_duration,
                    maintenance_cost: editingItem.maintenance_cost ?? undefined,
                    fuel_cost: editingItem.fuel_cost ?? undefined,
                    type: editingItem.type || undefined,
                    group_id: editingItem.group_id || "ungrouped",
                  }
                : undefined
            }
            onSubmit={onSubmit}
            onCancel={closeForm}
            isSubmitting={isAddingEquipment || isUpdatingEquipment}
            groups={groups}
            currency={currency}
            rentalOptions={rentalOptions}
            isLoadingRentalOptions={isLoadingRentalOptions}
            periodUnits={periodUnits}
            isLoadingPeriodUnits={isLoadingPeriodUnits}
          />
        </div>
      )}
      {isMobile ? (
        <div className="space-y-3">
          {equipment.map((item) => (
            <MobileItemCard
              key={item.id}
              name={item.name}
              subtitle={`${item.quantity} × ${format(item.cost_per_period, currency)}`}
              total={format(item.total_cost || 0, currency)}
              selected={selection.isSelected(item.id)}
              onToggle={() => selection.toggle(item.id)}
              isOwner={canEdit}
              actions={isSelectMode ? undefined : (
                <ItemActions
                  isOwner={canEdit}
                  onComment={() => onOpenComments(item, "equipment")}
                  onDuplicate={() => handleDuplicateEquipment(item)}
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
          {equipment.length === 0 && (
            <div className="text-center h-24 text-sm text-muted-foreground">
              {t("noItems")}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={equipment}
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
            selectAllLabel: t("common:selectAllEquipment"),
          }}
          ariaLabel={t("project_equipment:tableLabel")}
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
        onConfirm={() => deleteTarget && handleDeleteEquipment(deleteTarget.id)}
        itemName={deleteTarget?.name}
        loading={isDeletingEquipment}
      />
      <DeleteConfirmationDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={() =>
          handleBulkDeleteEquipment(Array.from(selection.selectedIds))
        }
        itemName={`${selection.count} items`}
        loading={isBulkDeletingEquipment}
      />
      <BulkMoveDialog
        open={showBulkMove}
        onOpenChange={setShowBulkMove}
        groups={groups}
        count={selection.count}
        loading={isBulkMovingEquipment}
        onConfirm={(groupId) =>
          handleBulkMoveEquipment(Array.from(selection.selectedIds), groupId)
        }
      />
      <ProjectCsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        itemType="equipment"
        onImport={(values) =>
          handleAddOrUpdateEquipment(values as EquipmentFormValues, currency)
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