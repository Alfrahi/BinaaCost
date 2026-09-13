import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Copy, Trash, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionBar } from "@/components/BulkActionBar";
import { PaginationControls } from "@/components/PaginationControls";
import { useAuth } from "@/components/AuthProvider";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { useLibrarySyncManager } from "@/hooks/useLibrarySyncManager";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, getIconMarginClass } from "@/lib/utils";
import { handleError } from "@/utils/toast";

const libraryMaterialSchema = z.object({
  name: z.string().min(1, "resources:materials.nameRequired"),
  description: z.string().optional().nullable(),
  unit: z.string().min(1, "resources:materials.unitRequired"),
  unit_price: z.coerce.number().min(0, "resources:materials.priceNonNegative"),
});

type LibraryMaterialFormValues = z.infer<typeof libraryMaterialSchema>;

export default function LibraryMaterialsManager() {
  const { t } = useTranslation(["resources", "common"]);
  const { user } = useAuth();
  const { format } = useCurrencyFormatter();
  const { options: materialUnits, isLoading: isLoadingMaterialUnits } =
    useSettingsOptions("material_unit");

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { itemsQuery, createItem, updateItem, deleteItem, deleteItems } =
    useLibrarySyncManager({
      tableName: "library_materials",
      queryKey: ["library_materials"],
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

  const form = useForm<LibraryMaterialFormValues>({
    resolver: zodResolver(libraryMaterialSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: materialUnits[0]?.value || "",
      unit_price: 0,
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        description: editingItem.description,
        unit: editingItem.unit,
        unit_price: editingItem.unit_price,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        unit: materialUnits[0]?.value || "",
        unit_price: 0,
      });
    }
  }, [editingItem, form, materialUnits]);

  useEffect(() => {
    if (!form.getValues("unit") && materialUnits.length > 0) {
      form.setValue("unit", materialUnits[0].value);
    }
  }, [materialUnits, form]);

  const resetForm = useCallback(() => {
    form.reset({
      name: "",
      description: "",
      unit: materialUnits[0]?.value || "",
      unit_price: 0,
    });
    setEditingItem(null);
    setIsFormOpen(false);
  }, [form, materialUnits]);

  const onSubmit = useCallback(
    async (values: LibraryMaterialFormValues) => {
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
          description: item.description,
          unit: item.unit,
          unit_price: item.unit_price,
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

  const headerClass =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10 px-3 py-2";

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t("resources:materials")}</h2>
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
            <h3 className="font-semibold text-lg">
              {editingItem ? t("common:edit") : t("common:add")}{" "}
              {t("resources:materials.material")}
            </h3>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                {t("resources:materials.name")}
              </Label>
              <Input id="name" {...form.register("name")} className="text-sm" />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs mt-1">
                  {t(form.formState.errors.name.message!)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                {t("common:description")}
              </Label>
              <Input
                id="description"
                {...form.register("description")}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="unit" className="text-sm font-medium">
                {t("resources:materials.unit")}
              </Label>
              <TranslatedSelect
                value={form.watch("unit")}
                onValueChange={(value) => form.setValue("unit", value)}
                options={materialUnits}
                isLoading={isLoadingMaterialUnits}
                placeholder={t("resources:materials.unitPlaceholder")}
                className="text-sm"
              />
              {form.formState.errors.unit && (
                <p className="text-destructive text-xs mt-1">
                  {t(form.formState.errors.unit.message!)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="unit_price" className="text-sm font-medium">
                {t("resources:materials.unitPrice")} (USD)
              </Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                {...form.register("unit_price")}
                className="text-sm"
              />
              {form.formState.errors.unit_price && (
                <p className="text-destructive text-xs mt-1">
                  {t(form.formState.errors.unit_price.message!)}
                </p>
              )}
            </div>
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

      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={`w-[40px] ${headerClass}`}>
                <Checkbox
                  checked={selection.allSelected}
                  onCheckedChange={selection.toggleAll}
                  aria-label={t("common:selectAllMaterials")}
                />
              </TableHead>
              <TableHead className={`${headerClass} text-start min-w-[150px]`}>
                {t("resources:materials.name")}
              </TableHead>
              <TableHead className={`${headerClass} text-start min-w-[200px]`}>
                {t("common:description")}
              </TableHead>
              <TableHead className={`${headerClass} text-start min-w-[80px]`}>
                {t("resources:materials.unit")}
              </TableHead>
              <TableHead className={`${headerClass} text-start min-w-[120px]`}>
                {t("resources:materials.unitPrice")} (USD)
              </TableHead>
              <TableHead className={`${headerClass} text-end min-w-[100px]`}>
                {t("common:actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("common:noItems")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => (
                <TableRow key={item.id} className="border-t border-border">
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
                  <TableCell className="px-3 py-2 text-start min-w-[200px] text-foreground">
                    {item.description || t("common:noDescription")}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-start min-w-[80px] text-foreground">
                    {materialUnits.find((u) => u.value === item.unit)?.label ||
                      item.unit}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-start min-w-[120px] text-foreground">
                    {format(item.unit_price, "USD")}
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
              ))
            )}
          </TableBody>
        </Table>
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
