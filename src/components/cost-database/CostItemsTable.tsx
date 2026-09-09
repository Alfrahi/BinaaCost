import { useState, useMemo, useCallback } from "react";
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
import { PaginationControls } from "@/components/PaginationControls";
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

  if (itemsQuery.isLoading) {
    return <div className="text-sm">{t("common:loading")}...</div>;
  }

  const headerClass =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10 px-3 py-2";

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
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-text-secondary">
              {database.currency}
            </span>
          </div>
          <p className="text-sm text-text-secondary">{database.description}</p>
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
        <div className="text-sm text-text-secondary">
          {count} {t("common:items")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">
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
          <span className="text-sm text-text-secondary">
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

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              {canEdit && (
                <th className={`w-[40px] ${headerClass}`}>
                  <Checkbox
                    checked={selection.allSelected}
                    onCheckedChange={selection.toggleAll}
                    aria-label={t("common:all")}
                  />
                </th>
              )}
              <th className={`${headerClass} text-start min-w-[100px]`}>
                {t("project_costs:csiCode")}
              </th>
              <th className={`${headerClass} text-start min-w-[200px]`}>
                {t("common:description")}
              </th>
              <th className={`${headerClass} text-start min-w-[80px]`}>
                {t("common:unit")}
              </th>
              <th className={`${headerClass} text-start min-w-[120px]`}>
                {t("common:price")}
              </th>
              {selectedLocation && (
                <th className={`${headerClass} text-start min-w-[120px]`}>
                  {t("pages:cost_databases.adjustedPrice")}
                </th>
              )}
              {canEdit && (
                <th className={`${headerClass} text-end min-w-[100px]`}>
                  {t("common:actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                {canEdit && (
                  <td className="px-3 py-2 w-[40px]">
                    <Checkbox
                      checked={selection.isSelected(item.id)}
                      onCheckedChange={() => selection.toggle(item.id)}
                      aria-label={`${t("common:select")} ${item.description}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-start text-sm min-w-[100px]">
                  {item.csi_code}
                </td>
                <td className="px-3 py-2 text-start text-sm min-w-[200px]">
                  {item.description}
                </td>
                <td className="px-3 py-2 text-start text-sm min-w-[80px]">
                  {item.unit}
                </td>
                <td className="px-3 py-2 text-start text-sm min-w-[120px]">
                  {format(item.unit_price, database.currency)}
                </td>
                {selectedLocation && (
                  <td className="px-3 py-2 text-start text-sm font-medium min-w-[120px]">
                    {format(
                      getAdjustedPrice(item.unit_price),
                      database.currency,
                    )}
                  </td>
                )}
                {canEdit && (
                  <td className="px-3 py-2 flex gap-2 justify-end min-w-[100px]">
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
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={
                    canEdit
                      ? selectedLocation
                        ? 7
                        : 6
                      : selectedLocation
                        ? 6
                        : 5
                  }
                  className="text-center py-8 text-text-secondary text-sm"
                >
                  {t("common:noItems")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
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
