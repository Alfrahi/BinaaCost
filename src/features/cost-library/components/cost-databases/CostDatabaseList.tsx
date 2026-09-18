"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { useCostDatabases } from "@/features/cost-library/hooks/useCostDatabases";
import { useSettingsOptions } from "@/features/admin/hooks/useSettingsOptions";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Heading } from "@/shared/components/ui/heading";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import { Edit2, Trash2, Plus, Search, X } from "lucide-react";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";
import { CostDatabase } from "@/features/cost-library/databases/types/databases";

const costDatabaseSchema = z.object({
  name: z.string().min(1, "pages:cost_databases.nameRequired"),
  description: z.string().optional().nullable(),
  is_public: z.boolean().default(false),
  currency: z.string().min(1, "pages:cost_databases.currencyRequired"),
});

type CostDatabaseFormValues = z.infer<typeof costDatabaseSchema>;

interface CostDatabaseListProps {
  onViewDatabase: (id: string) => void;
}

export default function CostDatabaseList({
  onViewDatabase,
}: CostDatabaseListProps) {
  const { t } = useTranslation(["resources", "common", "pages"]);
  const { databasesQuery, createDatabase, updateDatabase, deleteDatabase } =
    useCostDatabases();
  const { options: currencies, isLoading: isLoadingCurrencies } =
    useSettingsOptions("currency");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const defaultCurrency = useMemo(
    () => currencies[0]?.value || "USD",
    [currencies],
  );

  const form = useForm<CostDatabaseFormValues>({
    resolver: zodResolver(costDatabaseSchema),
    defaultValues: {
      name: "",
      description: "",
      is_public: false,
      currency: defaultCurrency,
    },
  });

  const { data: databases = [] } = databasesQuery;

  const filteredDatabases = databases.filter(
    (db) =>
      db.name.toLowerCase().includes(search.toLowerCase()) ||
      (db.description &&
        db.description.toLowerCase().includes(search.toLowerCase())),
  );

  const paginatedDatabases = filteredDatabases.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  const totalPages = Math.ceil(filteredDatabases.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  useEffect(() => {
    if (editingId && editingId !== "new") {
      const db = databases.find((d) => d.id === editingId);
      if (db) {
        form.reset({
          name: db.name,
          description: db.description || "",
          is_public: db.is_public,
          currency: db.currency,
        });
      }
    } else if (editingId === "new") {
      form.reset({
        name: "",
        description: "",
        is_public: false,
        currency: defaultCurrency,
      });
    }
  }, [editingId, databases, form, defaultCurrency]);

  const handleSubmit = useCallback(
    async (values: CostDatabaseFormValues) => {
      try {
        const sanitizedDescription =
          sanitizeText(values.description) ?? undefined;

        if (editingId && editingId !== "new") {
          await updateDatabase.mutateAsync({
            id: editingId,
            name: sanitizeText(values.name) || "",
            description: sanitizedDescription,
            is_public: values.is_public,
            currency: values.currency,
          });
          toast.success(t("common:success"));
        } else {
          await createDatabase.mutateAsync({
            name: sanitizeText(values.name) || "",
            description: sanitizedDescription,
            is_public: values.is_public,
            currency: values.currency,
          });
          toast.success(t("common:success"));
        }
        setEditingId(null);
      } catch (error) {
        toast.error(t("common:error"));
      }
    },
    [editingId, updateDatabase, createDatabase, t],
  );

  const handleDelete = useCallback(async () => {
    if (deleteTarget) {
      try {
        await deleteDatabase.mutateAsync({ id: deleteTarget });
        toast.success(t("common:success"));
        setDeleteTarget(null);
      } catch (error) {
        toast.error(t("common:error"));
      }
    }
  }, [deleteTarget, deleteDatabase, t]);

  const allIds = useMemo(() => databases.map((db) => db.id), [databases]);
  const selection = useBulkSelection(allIds);

  const handleBulkDelete = useCallback(async () => {
    try {
      toast.info(t("pages:cost_databases.bulkDeleteNotImplemented"));
      selection.clear();
    } catch (error) {
      toast.error(t("common:error"));
    }
  }, [selection, t]);

  const columns = useMemo<DataTableColumn<CostDatabase>[]>(
    () => [
      { key: "name", label: t("common:name") },
      { key: "description", label: t("common:description") },
      { key: "currency", label: t("common:currency") },
      { key: "public", label: t("pages:cost_databases.public") },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Heading level={1}>
          {t("pages:cost_databases.title")}
        </Heading>
        <div className="flex gap-2">
          {selection.hasSelection && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="ms-2 h-4 w-4" />
              {t("common:delete")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common:search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-8"
          />
        </div>
        <Button onClick={() => setEditingId("new")}>
          <Plus className="ms-2 h-4 w-4" />
          {t("common:add")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={paginatedDatabases}
        getRowKey={(db) => db.id}
        selection={{
          selectedIds: selection.selectedIds,
          allSelected: selection.allSelected,
          onToggle: selection.toggle,
          onToggleAll: selection.toggleAll,
          selectAllLabel: t("common:selectAll"),
        }}
        renderRow={(db) => (
          <TableRow key={db.id}>
            <TableCell className="w-[40px]">
              <Checkbox
                checked={selection.isSelected(db.id)}
                onCheckedChange={() => selection.toggle(db.id)}
                aria-label={`${t("common:select")} ${db.name}`}
              />
            </TableCell>
            <TableCell>{db.name}</TableCell>
            <TableCell>{db.description || t("common:notSpecified")}</TableCell>
            <TableCell>{db.currency}</TableCell>
            <TableCell>
              <Checkbox checked={db.is_public} disabled />
            </TableCell>
            <TableCell>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewDatabase(db.id)}
                >
                  {t("common:view")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(db.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(db.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
        emptyMessage={t("common:noItems")}
        ariaLabel={t("pages:cost_databases.title")}
      />

      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-modal">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingId === "new" ? t("common:add") : t("common:edit")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {t("common:name")}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {t("common:description")}
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {t("common:currency")}
                        </FormLabel>
                        <FormControl>
                          <TranslatedSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={currencies}
                            isLoading={isLoadingCurrencies}
                            placeholder={t("pages:cost_databases.selectCurrency")}
                            aria-label={t("common:currency")}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_public"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm">
                          {t("pages:cost_databases.public")}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="ms-2 h-4 w-4" />
                      {t("common:cancel")}
                    </Button>
                    <Button type="submit">
                      {editingId === "new"
                        ? t("common:add")
                        : t("common:update")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={databases.find((db) => db.id === deleteTarget)?.name}
        loading={deleteDatabase.isPending}
      />
    </div>
  );
}
