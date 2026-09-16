import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, Trash, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
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
} from "@/components/ui/form";
import { useLibrarySyncManager } from "@/hooks/useLibrarySyncManager";
import { handleError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import DataTable, {
  DataTableColumn,
} from "@/components/ui/data-table";

const laborSchema = z.object({
  worker_type: z.string().min(1, "resources:fields.workerTypeRequired"),
  daily_rate: z.coerce.number().min(0, "resources:fields.dailyRateNonNegative"),
});

type LaborFormValues = z.infer<typeof laborSchema>;

export default function LibraryLaborManager() {
  const { t, i18n } = useTranslation(["resources", "common"]);
  const { user } = useAuth();
  const { format } = useCurrencyFormatter();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const form = useForm<LaborFormValues>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      worker_type: "",
      daily_rate: 0,
    },
  });

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
    form.reset();
  }, [form]);

  const queryKey = ["library_labor"];

  const { itemsQuery, createItem, updateItem, deleteItem, deleteItems } =
    useLibrarySyncManager({
      tableName: "library_labor",
      queryKey: queryKey,
      userId: user?.id,
      page: currentPage,
      pageSize: pageSize,
      select: "*",
      order: "worker_type",
      searchTerm: search,
      searchColumn: "worker_type",
    });

  const onSubmit = useCallback(
    async (values: LaborFormValues) => {
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
        closeForm();
      } catch (e: any) {
        handleError(e);
      }
    },
    [editingItem, updateItem, createItem, user?.id, t, closeForm],
  );

  const openForm = useCallback(
    (item?: any) => {
      if (item) {
        setEditingItem(item);
        form.reset({
          worker_type: item.worker_type,
          daily_rate: item.daily_rate || 0,
        });
      } else {
        setEditingItem(null);
        form.reset({
          worker_type: "",
          daily_rate: 0,
        });
      }
      setIsFormOpen(true);
    },
    [form],
  );

  const handleDuplicate = useCallback(
    async (item: any) => {
      try {
        await createItem.mutateAsync({
          worker_type: `${item.worker_type} (${t("common:copy")})`,
          daily_rate: item.daily_rate,
          user_id: user?.id,
        });
        toast.success(t("common:success"));
      } catch (e: any) {
        handleError(e);
      }
    },
    [createItem, user?.id, t],
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

  const columns = useMemo<DataTableColumn<any>[]>(
    () => [
      { key: "worker_type", label: t("resources:fields.workerType") },
      {
        key: "daily_rate",
        label: `${t("resources:fields.dailyRate")} (USD)`,
      },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <Heading level={1}>{t("resources:labor")}</Heading>
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
              {t("resources:labor.laborItem")}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="worker_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t("resources:fields.workerType")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="text-sm" />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="daily_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t("resources:fields.dailyRate")} (USD)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
              </div>
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
          selectAllLabel: t("common:selectAllLabor"),
        }}
        renderRow={(item) => (
          <TableRow key={item.id}>
            <TableCell className="px-3 py-2 w-[40px]">
              <Checkbox
                checked={selection.isSelected(item.id)}
                onCheckedChange={() => selection.toggle(item.id)}
                aria-label={`${t("common:select")} ${item.worker_type}`}
              />
            </TableCell>
            <TableCell className="px-3 py-2 font-medium text-start text-sm min-w-[200px] text-foreground">
              {item.worker_type}
            </TableCell>
            <TableCell className="px-3 py-2 text-start text-sm min-w-[150px] text-foreground">
              {format(item.daily_rate, "USD")}
            </TableCell>
            <TableCell className="px-3 py-2 flex gap-2 justify-end min-w-[100px]">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleDuplicate(item)}
                aria-label={`${t("common:duplicate")} ${item.worker_type}`}
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
        ariaLabel={t("resources:labor")}
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
        itemName={deleteTarget?.worker_type}
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
