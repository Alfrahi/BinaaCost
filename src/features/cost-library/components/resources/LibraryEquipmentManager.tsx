import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import { Plus, Edit2, Trash2, Copy, Trash, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import { BulkActionBar } from "@/shared/components/BulkActionBar";
import { PaginationControls } from "@/shared/components/PaginationControls";
import { useAuth } from "@/app/providers/AuthProvider";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { useLibrarySyncManager } from "@/features/cost-library/hooks/useLibrarySyncManager";
import { useSettingsOptions } from "@/features/admin/hooks/useSettingsOptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { handleError } from "@/shared/lib/toast";

const libraryEquipmentSchema = z.object({
  name: z.string().min(1, "resources:equipment.nameRequired"),
  type: z.string().optional().nullable(),
  rental_or_purchase: z
    .string()
    .min(1, "resources:equipment.rentalPurchaseRequired"),
  cost_per_period: z.coerce
    .number()
    .min(0, "resources:equipment.costNonNegative"),
  period_unit: z.string().min(1, "resources:equipment.periodUnitRequired"),
});

type LibraryEquipmentFormValues = z.infer<typeof libraryEquipmentSchema>;

export default function LibraryEquipmentManager() {
  const { t } = useTranslation(["resources", "common"]);
  const { user } = useAuth();
  const { format } = useCurrencyFormatter();
  const { options: rentalOptions, isLoading: isLoadingRentalOptions } =
    useSettingsOptions("equipment_rental_purchase");
  const { options: periodUnits, isLoading: isLoadingPeriodUnits } =
    useSettingsOptions("equipment_period_unit");

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { itemsQuery, createItem, updateItem, deleteItem, deleteItems } =
    useLibrarySyncManager({
      tableName: "library_equipment",
      queryKey: ["library_equipment"],
      userId: user?.id,
      page: currentPage,
      pageSize: pageSize,
      select: "*",
      order: "name",
      searchTerm: search,
      searchColumn: "name",
    });

  const { data: items = [], count = 0 } = itemsQuery.data || {};
  const isLoading = itemsQuery.isLoading;
  const totalPages = Math.ceil(count / pageSize);

  useEffect(() => {
    setCurrentPage(0);
  }, [search, pageSize]);

  const allVisibleIds = useMemo(
    () => items.map((item: any) => item.id),
    [items],
  );
  const selection = useBulkSelection(allVisibleIds);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const form = useForm<LibraryEquipmentFormValues>({
    resolver: zodResolver(libraryEquipmentSchema),
    defaultValues: {
      name: "",
      type: "",
      rental_or_purchase: rentalOptions[0]?.value || "Rental",
      cost_per_period: 0,
      period_unit: periodUnits[0]?.value || "Day",
    },
  });

  const rentalOrPurchase = form.watch("rental_or_purchase");
  const isPurchase = rentalOrPurchase === "Purchase";

  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        type: editingItem.type,
        rental_or_purchase: editingItem.rental_or_purchase,
        cost_per_period: editingItem.cost_per_period,
        period_unit: editingItem.period_unit,
      });
    } else {
      form.reset({
        name: "",
        type: "",
        rental_or_purchase: rentalOptions[0]?.value || "Rental",
        cost_per_period: 0,
        period_unit: periodUnits[0]?.value || "Day",
      });
    }
  }, [editingItem, form, rentalOptions, periodUnits]);

  useEffect(() => {
    if (!form.getValues("rental_or_purchase") && rentalOptions.length > 0) {
      form.setValue("rental_or_purchase", rentalOptions[0].value);
    }
    if (!form.getValues("period_unit") && periodUnits.length > 0) {
      form.setValue("period_unit", periodUnits[0].value);
    }
  }, [rentalOptions, periodUnits, form]);

  const resetForm = useCallback(() => {
    form.reset({
      name: "",
      type: "",
      rental_or_purchase: rentalOptions[0]?.value || "Rental",
      cost_per_period: 0,
      period_unit: periodUnits[0]?.value || "Day",
    });
    setEditingItem(null);
    setIsFormOpen(false);
  }, [form, rentalOptions, periodUnits]);

  const onSubmit = useCallback(
    async (values: LibraryEquipmentFormValues) => {
      try {
        if (editingItem) {
          await updateItem.mutateAsync({
            id: editingItem.id,
            ...values,
            user_id: user?.id,
          });
        } else {
          await createItem.mutateAsync({ ...values, user_id: user?.id });
        }
        toast.success(t("common:success"));
        resetForm();
      } catch (e: any) {
        handleError(e);
      }
    },
    [editingItem, updateItem, createItem, user?.id, t, resetForm],
  );

  const handleDuplicate = useCallback(
    async (item: any) => {
      try {
        await createItem.mutateAsync({
          name: `${item.name} (${t("common:copy")})`,
          type: item.type,
          rental_or_purchase: item.rental_or_purchase,
          cost_per_period: item.cost_per_period,
          period_unit: item.period_unit,
          user_id: user?.id,
        });
        toast.success(t("common:success"));
      } catch (e: any) {
        handleError(e);
      }
    },
    [createItem, user?.id, t],
  );

  const handleBulkDelete = useCallback(async () => {
    try {
      await deleteItems.mutateAsync(Array.from(selection.selectedIds));
      toast.success(t("common:success"));
      selection.clear();
      setShowBulkDelete(false);
    } catch (e: any) {
      handleError(e);
    }
  }, [deleteItems, selection, t]);

  const columns = useMemo<DataTableColumn<any>[]>(
    () => [
      { key: "name", label: t("resources:equipment.name") },
      { key: "type", label: t("resources:equipment.type") },
      {
        key: "rental_or_purchase",
        label: t("resources:equipment.rentalPurchase"),
      },
      {
        key: "cost_per_period",
        label: `${t("resources:equipment.costPerPeriod")} (USD)`,
      },
      { key: "period_unit", label: t("resources:equipment.periodUnit") },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <Heading level={1}>{t("resources:equipment")}</Heading>
        {!isFormOpen && (
          <Button
            onClick={() => setIsFormOpen(true)}
            size="icon"
            aria-label={t("common:add")}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {isFormOpen && (
        <div className="border rounded-lg p-4 bg-muted space-y-3">
          <div className="flex justify-between items-center">
            <Heading level={3}>
              {editingItem ? t("common:edit") : t("common:add")}{" "}
              {t("resources:equipment.equipment")}
            </Heading>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetForm}
              aria-label={t("common:close")}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t("resources:equipment.name")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t("resources:equipment.type")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} className="text-sm" />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rental_or_purchase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t("resources:equipment.rentalPurchase")}
                    </FormLabel>
                    <FormControl>
                      <TranslatedSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={rentalOptions}
                        isLoading={isLoadingRentalOptions}
                        placeholder={t("resources:equipment.rentalPurchasePlaceholder")}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_per_period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {isPurchase
                        ? t("resources:equipment.purchaseCost")
                        : t("resources:equipment.costPerPeriod")}{" "}
                      (USD)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />
              {!isPurchase && (
                <FormField
                  control={form.control}
                  name="period_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {t("resources:equipment.periodUnit")}
                      </FormLabel>
                      <FormControl>
                        <TranslatedSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={periodUnits}
                          isLoading={isLoadingPeriodUnits}
                          placeholder={t("resources:equipment.periodUnitPlaceholder")}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="text-sm"
                >
                  {t("common:cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createItem.isPending || updateItem.isPending}
                  className="text-sm"
                >
                  {t("common:save")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder={t("common:searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm w-full"
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {t("common:item", { count: count })}
        </div>
        <div className="flex items-center gap-2">
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
        selection={{
          selectedIds: selection.selectedIds,
          allSelected: selection.allSelected,
          onToggle: selection.toggle,
          onToggleAll: selection.toggleAll,
          selectAllLabel: t("common:selectAllEquipment"),
        }}
        renderRow={(item) => (
          <TableRow key={item.id}>
            <TableCell className="px-3 py-2 w-[40px]">
              <Checkbox
                checked={selection.isSelected(item.id)}
                onCheckedChange={() => selection.toggle(item.id)}
                aria-label={`${t("common:select")} ${item.name}`}
              />
            </TableCell>
            <TableCell className="px-3 py-2 text-start font-medium min-w-[150px] text-foreground">
              {item.name}
            </TableCell>
            <TableCell className="px-3 py-2 text-start min-w-[100px] text-foreground">
              {item.type || t("common:noDescription")}
            </TableCell>
            <TableCell className="px-3 py-2 text-start min-w-[120px] text-foreground">
              {rentalOptions.find((o) => o.value === item.rental_or_purchase)
                ?.label || item.rental_or_purchase}
            </TableCell>
            <TableCell className="px-3 py-2 text-start min-w-[120px] text-foreground">
              {format(item.cost_per_period, "USD")}
            </TableCell>
            <TableCell className="px-3 py-2 text-start min-w-[100px] text-foreground">
              {periodUnits.find((u) => u.value === item.period_unit)?.label ||
                item.period_unit}
            </TableCell>
            <TableCell className="px-3 py-2 flex gap-2 justify-end min-w-[100px]">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleDuplicate(item)}
                aria-label={`${t("common:duplicate")} ${item.name}`}
                className="h-7 w-7"
              >
                <Copy className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  setEditingItem(item);
                  setIsFormOpen(true);
                }}
                aria-label={`${t("common:edit")} ${item.name}`}
                className="h-7 w-7"
              >
                <Edit2 className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => setDeleteTarget(item)}
                aria-label={`${t("common:delete")} ${item.name}`}
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </Button>
            </TableCell>
          </TableRow>
        )}
        isLoading={isLoading}
        emptyMessage={t("common:noItems")}
        ariaLabel={t("resources:equipment")}
      />

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
          deleteTarget && deleteItem.mutateAsync({ id: deleteTarget.id })
        }
        itemName={deleteTarget?.name}
        loading={deleteItem.isPending}
      />

      <DeleteConfirmationDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={handleBulkDelete}
        itemName={`${selection.count} ${t("common:items")}`}
        loading={deleteItems.isPending}
      />
    </div>
  );
}
