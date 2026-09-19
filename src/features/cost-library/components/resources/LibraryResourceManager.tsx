

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Plus, Edit2, Trash2, Trash, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import { BulkActionBar } from "@/shared/components/BulkActionBar";
import { PaginationControls } from "@/shared/components/PaginationControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { useLibrarySyncManager } from "@/features/cost-library/hooks/useLibrarySyncManager";
import { handleError } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import DataTable, {
  DataTableColumn,
  MIN_WIDTH_CLASSES,
} from "@/shared/components/ui/data-table";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";

interface FormFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  isLoading?: boolean;
  step?: string;
  min?: number | string;
  conditional?: (values: any) => boolean;
  formatLabel?: (values: any) => string;
}

interface ResourceManagerConfig<T extends z.ZodTypeAny> {
  tableName: string;
  queryKey: string[];
  titleKey: string;

  itemLabelKey: string;
  schema: T;
  defaultValues: z.infer<T>;
  formFields: FormFieldConfig[];
  columns: DataTableColumn<any>[];
  selectAllLabelKey: string;
  getItemName: (item: any) => string;
  getDuplicateName: (item: any, copyLabel: string) => any;
  transformForDb?: (values: z.infer<T>) => any;
}

export function LibraryResourceManager<T extends z.ZodTypeAny>({
  tableName,
  queryKey,
  titleKey,
  itemLabelKey,
  schema,
  defaultValues,
  formFields,
  columns,
  selectAllLabelKey,
  getItemName,
  getDuplicateName,
  transformForDb,
}: ResourceManagerConfig<T>) {
  const { t, i18n } = useTranslation(["resources", "common"]);
  const { user } = useAuth();
  // const { format } = useCurrencyFormatter();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Safe wrapper for getItemName that handles null/undefined items
  const safeGetItemName = useCallback((item: any) => {
    if (!item) return "Unnamed Item";
    try {
      return getItemName(item);
    } catch {
      return "Unnamed Item";
    }
  }, [getItemName]);

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
    form.reset(defaultValues);
  }, [form, defaultValues]);

  const { itemsQuery, createItem, updateItem, deleteItem, deleteItems } =
    useLibrarySyncManager({
      tableName,
      queryKey,
      userId: user?.id,
      page: currentPage,
      pageSize,
      order: formFields.find((f) => f.name === "name" || f.name === "worker_type")?.name || "name",
      searchTerm: search,
      searchColumn: formFields.find((f) => f.name === "name" || f.name === "worker_type")?.name || "name",
    });

  const onSubmit = useCallback(
    async (values: z.infer<T>) => {
      try {
        const dbValues = transformForDb ? transformForDb(values) : values;
        if (editingItem) {
          await updateItem.mutateAsync({
            id: editingItem.id,
            ...dbValues,
            user_id: user?.id,
          });
        } else {
          await createItem.mutateAsync({ ...dbValues, user_id: user?.id });
        }
        toast.success(t("common:success"));
        closeForm();
      } catch (e: any) {
        handleError(e);
      }
    },
    [editingItem, updateItem, createItem, user?.id, t, closeForm, transformForDb],
  );

  const openForm = useCallback(
    (item?: any) => {
      if (item) {
        setEditingItem(item);
        form.reset(item);
      } else {
        setEditingItem(null);
        form.reset(defaultValues);
      }
      setIsFormOpen(true);
    },
    [form, defaultValues],
  );

  const handleDuplicate = useCallback(
    async (item: any) => {
      try {
        const duplicateData = getDuplicateName(item, t("common:copy"));
        await createItem.mutateAsync({
          ...duplicateData,
          user_id: user?.id,
        });
        toast.success(t("common:success"));
      } catch (e: any) {
        handleError(e);
      }
    },
    [createItem, user?.id, t, getDuplicateName],
  );

  const { data: items = [], count = 0 } = itemsQuery.data || {};
  const isLoading = itemsQuery.isLoading;
  const totalPages = Math.ceil(count / pageSize);

  useEffect(() => {
    setCurrentPage(0);
  }, [search, pageSize]);

  const allVisibleIds = useMemo(() => items.map((l: any) => l.id), [items]);
  const selection = useBulkSelection(allVisibleIds);

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

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <Heading level={1}>{t(titleKey)}</Heading>
        {!isFormOpen && (
          <Button
            onClick={() => openForm()}
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
              {t(itemLabelKey)}
            </Heading>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeForm}
              aria-label={t("common:close")}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {formFields.map((field) => (
                field.conditional && !field.conditional(form.watch()) ? null : (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {field.formatLabel
                            ? field.formatLabel(form.watch())
                            : t(field.label)}
                        </FormLabel>
                        <FormControl>
                          {field.type === "select" ? (
                            <TranslatedSelect
                              value={formField.value}
                              onValueChange={formField.onChange}
                              options={field.options || []}
                              isLoading={field.isLoading}
                              placeholder={field.placeholder
                                ? t(field.placeholder)
                                : undefined}
                              className="text-sm"
                            />
                          ) : (
                            <Input
                              {...formField}
                              type={field.type || "text"}
                              step={field.step}
                              min={field.min}
                              placeholder={field.placeholder
                                ? t(field.placeholder)
                                : undefined}
                              className="text-sm"
                            />
                          )}
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                )
              ))}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  className="text-sm"
                >
                  {t("common:cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createItem.isPending || updateItem.isPending}
                  className="text-sm"
                >
                  {createItem.isPending || updateItem.isPending
                    ? t("common:saving")
                    : t("common:save")}
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
          selectAllLabel: t(selectAllLabelKey),
        }}
        renderRow={(item) => (
          <TableRow key={item.id}>
            <TableCell className="px-3 py-2 w-[40px]">
              <Checkbox
                checked={selection.isSelected(item.id)}
                onCheckedChange={() => selection.toggle(item.id)}
                aria-label={`${t("common:select")} ${safeGetItemName(item)}`}
              />
            </TableCell>
            {columns
              .filter((c) => c.key !== "actions")
              .map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-start text-sm",
                    col.align === "end" && "text-end",
                    col.isCurrency && "tabular-nums",
                    col.className,
                    col.minWidth ? MIN_WIDTH_CLASSES[col.minWidth] : "",
                  )}
                >
                  {col.format
                    ? col.format(item[col.key], item)
                    : item[col.key] ?? ""}
                </TableCell>
              ))}
            <TableCell className="px-3 py-2 flex gap-2 justify-end min-w-[100px]">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleDuplicate(item)}
                aria-label={`${t("common:duplicate")} ${safeGetItemName(item)}`}
                className="h-7 w-7"
              >
                <Copy className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => openForm(item)}
                className="h-7 w-7"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setDeleteTarget(item)}
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </TableCell>
          </TableRow>
        )}
        isLoading={isLoading}
        emptyMessage={t("common:noItems")}
        ariaLabel={t(titleKey)}
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
            className={cn("w-4 h-4", i18n.dir() === "rtl" ? "ms-2" : "me-2")}
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
        itemName={safeGetItemName(deleteTarget)}
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