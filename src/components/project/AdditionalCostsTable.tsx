import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Layers,
  Trash,
  Copy,
  MessageSquare,
  Edit2,
  Trash2,
  Upload,
} from "lucide-react";
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

const PAGE_SIZE = 50;

interface AdditionalCostRowProps {
  item: AdditionalCostItem;
  currency: string;
  isOwner: boolean;
  onEdit: (item: AdditionalCostItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: AdditionalCostItem) => void;
  onComment: (item: AdditionalCostItem) => void;
  selected: boolean;
  onToggle: () => void;
  additionalCategories: { value: string; label: string }[];
}

function AdditionalCostRow({
  item,
  currency,
  isOwner,
  onEdit,
  onDelete,
  onDuplicate,
  onComment,
  selected,
  onToggle,
  additionalCategories,
}: AdditionalCostRowProps) {
  const { t } = useTranslation(["project_additional", "common"]);
  const { format } = useCurrencyFormatter();

  return (
    <TableRow>
      <TableCell className="w-[40px]">
        {isOwner && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`${t("common:select")} ${item.category}`}
          />
        )}
      </TableCell>
      <TableCell className="text-start text-sm min-w-[150px]">
        {additionalCategories.find((c) => c.value === item.category)?.label ||
          item.category}
      </TableCell>
      <TableCell className="text-start text-sm min-w-[200px]">
        {item.description || t("common:notSpecified")}
      </TableCell>
      <TableCell className="text-end tabular-nums font-medium text-sm min-w-[120px]">
        {format(item.amount, currency)}
      </TableCell>
      <TableCell className="text-end min-w-[100px]">
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onComment(item)}
            title={t("common:comments")}
            aria-label={t("common:comments")}
            className="h-7 w-7"
          >
            <MessageSquare
              className="w-3 h-3 text-text-secondary"
              aria-hidden="true"
            />
          </Button>
          {isOwner && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onDuplicate(item)}
                title={t("common:duplicate")}
                aria-label={t("common:duplicate")}
                className="h-7 w-7"
              >
                <Copy className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(item)}
                aria-label={t("common:edit")}
                className="h-7 w-7"
              >
                <Edit2 className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(item.id)}
                aria-label={t("common:delete")}
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function AdditionalCostsTable({
  projectId,
  additionalCosts,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  additionalCategories,
  isLoadingAdditionalCategories,
}: {
  projectId: string;
  additionalCosts: AdditionalCostItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: AdditionalCostItem, itemType: string) => void;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
}) {
  const { t } = useTranslation([
    "project_additional",
    "project_detail",
    "common",
  ]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdditionalCostItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdditionalCostItem | null>(
    null,
  );
  const [showCsvImport, setShowCsvImport] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  const allIds = useMemo(
    () => additionalCosts.map((a) => a.id),
    [additionalCosts],
  );
  const selection = useBulkSelection(allIds);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const {
    handleAddOrUpdateAdditionalCost,
    handleDuplicateAdditionalCost,
    handleDeleteAdditionalCost,
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

  const grandTotal = additionalCosts.reduce(
    (sum, item) => safeAdd(sum, item.amount),
    0,
  );

  const displayRows = useMemo(() => {
    const rows: { type: "header" | "item"; data: any }[] = [];

    const ungrouped = additionalCosts.filter((m) => !m.group_id);
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
      const groupItems = additionalCosts.filter((m) => m.group_id === group.id);
      if (groupItems.length > 0) {
        rows.push({ type: "header", data: group });
        groupItems.forEach((item) => rows.push({ type: "item", data: item }));
      }
    });

    return rows;
  }, [additionalCosts, groups, t]);

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
              key: "category",
              label: t("columns.category"),
              type: "select",
              defaultValue: additionalCategories[0]?.value || "",
              options: additionalCategories,
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
            amount: Number(raw.amount),
            group_id: "ungrouped",
          })}
          onSubmit={(values) =>
            handleAddOrUpdateAdditionalCost(
              values as AdditionalCostFormValues,
            )
          }
          isSubmitting={isAddingAdditionalCost}
          submitLabel={t("add")}
          ariaLabel={t("add")}
        />
      )}
      {isFormOpen && (
        <Card className="p-4 mb-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? t("edit") : t("add")}
          </h3>
          <AdditionalCostForm
            editingItem={editingItem || undefined}
            onSubmit={onSubmit}
            onCancel={closeForm}
            isSubmitting={isAddingAdditionalCost || isUpdatingAdditionalCost}
            groups={groups}
            currency={currency}
            additionalCategories={additionalCategories}
            isLoadingAdditionalCategories={isLoadingAdditionalCategories}
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
                name={
                  additionalCategories.find(
                    (c) => c.value === item.category,
                  )?.label || item.category
                }
                subtitle={item.description || undefined}
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
                    onDelete={() => handleDeleteAdditionalCost(item.id)}
                    commentLabel={t("common:comments")}
                    duplicateLabel={t("common:duplicate")}
                    editLabel={t("common:edit")}
                    deleteLabel={t("common:delete")}
                  />
                )}
              />
            );
          })}
          {additionalCosts.length === 0 && (
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
                  {t("columns.category")}
                </TableHead>
                <TableHead className={`text-start ${headerClass} min-w-[200px]`}>
                  {t("columns.description")}
                </TableHead>
                <TableHead className={`text-end ${headerClass} min-w-[120px]`}>
                  {t("columns.amount")}
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
                        colSpan={canEdit ? 5 : 4}
                        className="font-semibold text-foreground text-sm"
                      >
                        {row.data.name}
                      </TableCell>
                    </TableRow>
                  );
                } else {
                  const item = row.data;
                  return (
                    <AdditionalCostRow
                      key={item.id}
                      item={item}
                      currency={currency}
                      isOwner={canEdit}
                      onEdit={openForm}
                      onDelete={handleDeleteAdditionalCost}
                      onDuplicate={handleDuplicateAdditionalCost}
                      onComment={(commentItem) =>
                        onOpenComments(commentItem, "additional")
                      }
                      selected={selection.isSelected(item.id)}
                      onToggle={() => selection.toggle(item.id)}
                      additionalCategories={additionalCategories}
                  />
                );
              }
            })}
            {additionalCosts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 5 : 4}
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
                colSpan={canEdit ? 3 : 2}
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
        onConfirm={() =>
          deleteTarget && handleDeleteAdditionalCost(deleteTarget.id)
        }
        itemName={
          deleteTarget
            ? `${additionalCategories.find((c) => c.value === deleteTarget.category)?.label || deleteTarget.category}: ${deleteTarget.description || ""}`
            : undefined
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
          handleBulkMoveAdditionalCosts(
            Array.from(selection.selectedIds),
            groupId,
          )
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
