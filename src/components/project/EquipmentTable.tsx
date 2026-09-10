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

const PAGE_SIZE = 50;

export default function EquipmentTable({
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
      equipment.reduce((sum, item) => safeAdd(sum, item.total_cost || 0), 0),
    [equipment],
  );

  const displayRows = useMemo(() => {
    const rows: { type: "header" | "item"; data: any }[] = [];

    const ungrouped = equipment.filter((m) => !m.group_id);
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
      const groupItems = equipment.filter((m) => m.group_id === group.id);
      if (groupItems.length > 0) {
        rows.push({ type: "header", data: group });
        groupItems.forEach((item) => rows.push({ type: "item", data: item }));
      }
    });

    return rows;
  }, [equipment, groups, t]);

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
              key: "cost_per_period",
              label: `${t("columns.costPerPeriod")} (${currency})`,
              type: "number",
              placeholder: t("columns.costPerPeriodPlaceholder"),
            },
          ]}
          schema={equipmentSchema}
          buildValues={(raw) => ({
            name: raw.name,
            quantity: Number(raw.quantity),
            cost_per_period: Number(raw.cost_per_period),
            rental_or_purchase: rentalOptions[0]?.value || "Rental",
            period_unit: periodUnits[0]?.value || "Day",
            usage_duration: 1,
            maintenance_cost: 0,
            fuel_cost: 0,
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
        <Card className="p-4 mb-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? t("edit") : t("add")}
          </h3>
          <EquipmentForm
            defaultValues={
              editingItem
                ? {
                    name: editingItem.name,
                    type: editingItem.type || "",
                    rental_or_purchase: editingItem.rental_or_purchase,
                    quantity: editingItem.quantity,
                    cost_per_period: editingItem.cost_per_period,
                    period_unit: editingItem.period_unit,
                    usage_duration: editingItem.usage_duration,
                    maintenance_cost: editingItem.maintenance_cost || 0,
                    fuel_cost: editingItem.fuel_cost || 0,
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
            const isPurchase = item.rental_or_purchase.toLowerCase() === "purchase";
            return (
              <MobileItemCard
                key={item.id}
                name={item.name}
                subtitle={
                  isPurchase
                    ? `${t("columns.quantity")}: ${item.quantity}`
                    : `${item.quantity} × ${format(item.cost_per_period, currency)}/${t(item.period_unit, { defaultValue: item.period_unit })} × ${item.usage_duration}`
                }
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
            );
          })}
          {equipment.length === 0 && (
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
                  {t("columns.name")}
                </TableHead>
                <TableHead className={`text-start ${headerClass} min-w-[100px]`}>
                  {t("columns.type")}
                </TableHead>
                <TableHead className={`text-start ${headerClass} min-w-[120px]`}>
                  {t("columns.rentalPurchase")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[80px]`}>
                  {t("columns.quantity")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                  {t("columns.costPerPeriod")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                  {t("columns.usageDuration")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                  {t("columns.estTotalCost")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[100px]`}>
                  {t("common:actions")}
                </TableHead>
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
                        colSpan={canEdit ? 9 : 8}
                        className="font-semibold text-foreground text-sm"
                      >
                        {row.data.name}
                      </TableCell>
                    </TableRow>
                  );
                } else {
                  const item = row.data;
                  return (
                    <EquipmentRow
                      key={item.id}
                      item={item}
                      currency={currency}
                      isOwner={canEdit}
                      onEdit={() => openForm(item)}
                      onDelete={() => setDeleteTarget(item)}
                      onDuplicate={() => handleDuplicateEquipment(item)}
                      onComment={(commentItem) =>
                        onOpenComments(commentItem, "equipment")
                      }
                      selected={selection.isSelected(item.id)}
                      onToggle={() => selection.toggle(item.id)}
                      rentalOptions={rentalOptions}
                    />
                  );
                }
              })}
              {equipment.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 9 : 8}
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
                  colSpan={canEdit ? 7 : 6}
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
