import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Layers, Trash, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableFooter,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkMoveDialog } from "@/components/project/BulkMoveDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { safeAdd } from "@/utils/math";
import { calculateItemCost } from "@/logic/shared";
import { PaginationControls } from "@/components/PaginationControls";
import { MaterialRow } from "./MaterialRow";
import { MaterialForm } from "./MaterialForm";
import { QuickAddRow } from "./QuickAddRow";
import ProjectCsvImportDialog from "./ProjectCsvImportDialog";
import { materialSchema, MaterialFormValues } from "@/types/schemas";
import { MaterialItem } from "@/types/project-items";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";

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
}: {
  projectId: string;
  materials: MaterialItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: MaterialItem, itemType: string) => void;
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
}) {
  const { t } = useTranslation([
    "project_materials",
    "project_detail",
    "common",
  ]);
  const { format } = useCurrencyFormatter();

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
            calculateItemCost.material(item.quantity, item.unit_price),
          ),
        0,
      ),
    [materials],
  );

  const displayRows = useMemo(() => {
    const rows: { type: "header" | "item"; data: any }[] = [];

    const ungrouped = materials.filter((m) => !m.group_id);
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
      const groupItems = materials.filter((m) => m.group_id === group.id);
      if (groupItems.length > 0) {
        rows.push({ type: "header", data: group });
        groupItems.forEach((item) => rows.push({ type: "item", data: item }));
      }
    });

    return rows;
  }, [materials, groups, t]);

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
              <TableHead className={`text-start ${headerClass} min-w-[200px]`}>
                {t("columns.description")}
              </TableHead>
              <TableHead className={`text-end ${headerClass} min-w-[100px]`}>
                {t("columns.quantity")}
              </TableHead>
              <TableHead className={`text-start ${headerClass} min-w-[80px]`}>
                {t("columns.unit")}
              </TableHead>
              <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                {t("columns.unitPrice")}
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
                      colSpan={canEdit ? 8 : 7}
                      className="font-semibold text-foreground text-sm"
                    >
                      {row.data.name}
                    </TableCell>
                  </TableRow>
                );
              } else {
                const item = row.data;
                return (
                  <MaterialRow
                    key={item.id}
                    item={item}
                    materialUnits={materialUnits}
                    currency={currency}
                    isOwner={canEdit}
                    onEdit={() => openForm(item)}
                    onDelete={() => setDeleteTarget(item)}
                    onDuplicate={() => handleDuplicateMaterial(item)}
                    onComment={(commentItem) =>
                      onOpenComments(commentItem, "material")
                    }
                    selected={selection.isSelected(item.id)}
                    onToggle={() => selection.toggle(item.id)}
                  />
                );
              }
            })}
            {materials.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 8 : 7}
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
                colSpan={canEdit ? 6 : 5}
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
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      <BulkActionBar count={selection.count} onClear={selection.clear}>
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
