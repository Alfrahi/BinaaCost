import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Upload, ArrowLeft, Trash } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useCostDatabaseItems,
  CostDatabaseItem,
} from "@/hooks/useCostDatabaseItems";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import CostItemsCsvImportDialog from "./CostItemsCsvImportDialog";
import { CostDatabase } from "@/types/cost-databases";
import { useAuth } from "@/components/AuthProvider";
import { useRole } from "@/hooks/useRole";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionBar } from "@/components/BulkActionBar";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import DataTable, {
  DataTableColumn,
} from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { handleError } from "@/utils/toast";
import { cn, getIconMarginClass } from "@/lib/utils";
import { Decimal } from "@/utils/math";
import { useLocationAdjustments } from "@/hooks/useLocationAdjustments";
import { CostItemForm, CostItemFormValues } from "./CostItemForm";

export default function CostItemsTable({
  database,
  onBack,
}: {
  database: CostDatabase;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation([
    "common",
    "pages",
    "admin",
    "project_costs",
  ]);
  const { user } = useAuth();
  const { isSuperAdmin } = useRole();
  const { format } = useCurrencyFormatter();

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { itemsQuery, createItem, updateItem, deleteItem, deleteItems } =
    useCostDatabaseItems(database.id, currentPage, pageSize);
  const { locations, isLoading: isLoadingLocations } = useLocationAdjustments(
    database.id,
  );

  const [editingItem, setEditingItem] = useState<CostDatabaseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostDatabaseItem | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const selectedLocation = useMemo(() => {
    return locations.find((loc) => loc.id === selectedLocationId);
  }, [locations, selectedLocationId]);

  const getAdjustedPrice = (unitPrice: number): number => {
    if (!selectedLocation) return unitPrice;
    return new Decimal(unitPrice)
      .times(selectedLocation.multiplier)
      .toDecimalPlaces(2)
      .toNumber();
  };

  const { data: items = [], count = 0 } = itemsQuery.data || {};
  const totalPages = Math.ceil(count / pageSize);
  const canEdit =
    database.user_id === user?.id || (database.is_public && isSuperAdmin);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const selection = useBulkSelection(allIds);

  const handleFormSubmit = useCallback(
    async (values: CostItemFormValues) => {
      try {
        if (editingItem) {
          await updateItem.mutateAsync({ id: editingItem.id, ...values });
          toast.success(t("admin:dropdowns.success_update"));
        } else {
          await createItem.mutateAsync({
            id: crypto.randomUUID(),
            database_id: database.id,
            csi_division: values.csi_division,
            csi_code: values.csi_code,
            description: values.description,
            unit: values.unit,
            unit_price: values.unit_price,
          });
          toast.success(t("admin:dropdowns.success_add"));
        }
        setShowForm(false);
        setEditingItem(null);
      } catch (e: any) {
        handleError(e);
      }
    },
    [createItem, database.id, editingItem, t, updateItem],
  );

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      await deleteItems.mutateAsync(Array.from(selection.selectedIds));
      toast.success(t("common:success"));
      selection.clear();
      setShowBulkDelete(false);
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns = useMemo<DataTableColumn<CostDatabaseItem>[]>(() => {
    const cols: DataTableColumn<CostDatabaseItem>[] = [
      { key: "csi_code", label: t("project_costs:csiCode") },
      { key: "description", label: t("common:description") },
      { key: "unit", label: t("common:unit") },
      { key: "unit_price", label: t("common:price") },
    ];
    if (selectedLocation) {
      cols.push({
        key: "adjusted_price",
        label: t("pages:cost_databases.adjustedPrice"),
      });
    }
    if (canEdit) {
      cols.push({ key: "actions", label: t("common:actions"), align: "end" });
    }
    return cols;
  }, [t, selectedLocation, canEdit]);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("common:back")}
        >
          <ArrowLeft
            className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{database.name}</h2>
            <Badge variant="muted">{database.currency}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{database.description}</p>
        </div>
      </div>

      {showForm && (
        <CostItemForm
          initialData={editingItem}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          isSubmitting={createItem.isPending || updateItem.isPending}
          currency={database.currency}
        />
      )}

      {!showForm && canEdit && (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 text-sm"
          >
            <Plus
              className={cn("w-4 h-4", getIconMarginClass())}
              aria-hidden="true"
            />
            {t("pages:cost_databases.add")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-2 text-sm"
          >
            <Upload
              className={cn("w-4 h-4", getIconMarginClass())}
              aria-hidden="true"
            />
            {t("pages:data_import.importCsv")}
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {count} {t("common:items")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("pages:cost_databases.adjustByLocation")}:
          </span>
          <Select
            value={selectedLocationId || "none"}
            onValueChange={setSelectedLocationId}
            disabled={isLoadingLocations}
          >
            <SelectTrigger className="w-[150px] h-8 text-sm">
              <SelectValue
                placeholder={t("pages:cost_databases.noAdjustment")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm">
                {t("pages:cost_databases.noAdjustment")}
              </SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id} className="text-sm">
                  {loc.city} ({loc.multiplier}x)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {t("common:rowsPerPage")}:
          </span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => {
              setPageSize(Number(val));
              setCurrentPage(0);
            }}
          >
            <SelectTrigger className="w-[70px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10" className="text-sm">
                10
              </SelectItem>
              <SelectItem value="20" className="text-sm">
                20
              </SelectItem>
              <SelectItem value="50" className="text-sm">
                50
              </SelectItem>
              <SelectItem value="100" className="text-sm">
                100
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        getRowKey={(item) => item.id}
        selection={
          canEdit
            ? {
                selectedIds: selection.selectedIds,
                allSelected: selection.allSelected,
                onToggle: selection.toggle,
                onToggleAll: selection.toggleAll,
                selectAllLabel: t("common:selectAll"),
              }
            : undefined
        }
        renderRow={(item) => (
          <TableRow key={item.id}>
            {canEdit && (
              <TableCell className="px-3 py-2 w-[40px]">
                <Checkbox
                  checked={selection.isSelected(item.id)}
                  onCheckedChange={() => selection.toggle(item.id)}
                  aria-label={`${t("common:select")} ${item.description}`}
                />
              </TableCell>
            )}
            <TableCell className="px-3 py-2 text-start text-sm min-w-[100px]">
              {item.csi_code}
            </TableCell>
            <TableCell className="px-3 py-2 text-start text-sm min-w-[200px]">
              {item.description}
            </TableCell>
            <TableCell className="px-3 py-2 text-start text-sm min-w-[80px]">
              {item.unit}
            </TableCell>
            <TableCell className="px-3 py-2 text-start text-sm min-w-[120px]">
              {format(item.unit_price, database.currency)}
            </TableCell>
            {selectedLocation && (
              <TableCell className="px-3 py-2 text-start text-sm font-medium min-w-[120px]">
                {format(getAdjustedPrice(item.unit_price), database.currency)}
              </TableCell>
            )}
            {canEdit && (
              <TableCell className="px-3 py-2 flex gap-2 justify-end min-w-[100px]">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setEditingItem(item);
                    setShowForm(true);
                  }}
                  aria-label={`${t("common:edit")} ${item.description}`}
                  className="h-7 w-7"
                >
                  <Edit2 className="w-3 h-3" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setDeleteTarget(item)}
                  aria-label={`${t("common:delete")} ${item.description}`}
                  className="h-7 w-7"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        )}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
        isLoading={itemsQuery.isLoading}
        emptyMessage={t("common:noItems")}
        ariaLabel={t("common:items")}
      />

      <BulkActionBar count={selection.count} onClear={selection.clear}>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowBulkDelete(true)}
          className="flex items-center gap-2 text-sm"
        >
          <Trash
            className={cn("w-4 h-4", getIconMarginClass())}
            aria-hidden="true"
          />
          {t("common:delete")}
        </Button>
      </BulkActionBar>

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget && deleteItem.mutate({ id: deleteTarget.id })
        }
        itemName={deleteTarget?.description}
        loading={deleteItem.isPending}
      />

      <DeleteConfirmationDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={handleBulkDelete}
        itemName={`${selection.count} ${t("common:items")}`}
        loading={isBulkDeleting}
      />

      <CostItemsCsvImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        databaseId={database.id}
      />
    </div>
  );
}
