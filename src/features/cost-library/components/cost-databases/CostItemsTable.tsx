import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Heading } from "@/shared/components/ui/heading";
import { Button } from "@/shared/components/ui/button";
import { Plus, Edit2, Trash2, Upload, ArrowLeft, Trash } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useCostDatabaseItems,
  CostDatabaseItem,
} from "@/features/cost-library/hooks/useCostDatabaseItems";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import CostItemsCsvImportDialog from "./CostItemsCsvImportDialog";
import { CostDatabase } from "@/features/cost-library/databases/types/databases";
import { useAuth } from "@/features/auth";
import { useRole } from "@/features/auth";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import { BulkActionBar } from "@/shared/components/BulkActionBar";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { handleError } from "@/shared/lib/toast";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { Decimal } from "@/shared/lib/math";
import { useLocationAdjustments } from "@/features/cost-library/hooks/useLocationAdjustments";
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
      if (!user?.id) {
        toast.error(t("common:mustBeLoggedIn"));
        return;
      }
      try {
        if (editingItem) {
          await updateItem.mutateAsync({ id: editingItem.id, ...values });
          toast.success(t("admin:dropdowns.success_update"));
        } else {
          await createItem.mutateAsync({
            id: crypto.randomUUID(),
            database_id: database.id,
            user_id: user.id,
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
    [createItem, database.id, editingItem, t, updateItem, user?.id],
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
      { key: "csi_code", label: t("project_costs:csiCode"), minWidth: "100px" },
      { key: "description", label: t("common:description"), minWidth: "200px" },
      { key: "unit", label: t("common:unit"), minWidth: "80px" },
      { key: "unit_price", label: t("common:price"), align: "end", minWidth: "120px" },
    ];
    if (selectedLocation) {
      cols.push({
        key: "adjusted_price",
        label: t("pages:cost_databases.adjustedPrice"),
        align: "end",
        minWidth: "120px",
      });
    }
    if (canEdit) {
      cols.push({ key: "actions", label: t("common:actions"), align: "end", minWidth: "100px" });
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
            <Heading level={2}>{database.name}</Heading>
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
              >
                {(() => {
                  const loc = locations.find((l) => l.id === selectedLocationId);
                  return loc ? `${loc.city} (${loc.multiplier}x)` : t("pages:cost_databases.noAdjustment");
                })()}
              </SelectValue>
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
              <SelectValue>
                {pageSize.toString()}
              </SelectValue>
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
              <TableCell className="w-[40px]">
                <Checkbox
                  checked={selection.isSelected(item.id)}
                  onCheckedChange={() => selection.toggle(item.id)}
                  aria-label={`${t("common:select")} ${item.description}`}
                />
              </TableCell>
            )}
            <TableCell className="text-start text-sm">{item.csi_code}</TableCell>
            <TableCell className="text-start text-sm">{item.description}</TableCell>
            <TableCell className="text-start text-sm">{item.unit}</TableCell>
            <TableCell className="text-end tabular-nums text-sm">
              {format(item.unit_price, database.currency)}
            </TableCell>
            {selectedLocation && (
              <TableCell className="text-end tabular-nums font-medium text-sm">
                {format(getAdjustedPrice(item.unit_price), database.currency)}
              </TableCell>
            )}
            {canEdit && (
              <TableCell className="text-end">
                <div className="flex gap-2 justify-end">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                    aria-label={`${t("common:edit")} ${item.description}`}
                    className="h-8 w-8"
                  >
                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`${t("common:delete")} ${item.description}`}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
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
