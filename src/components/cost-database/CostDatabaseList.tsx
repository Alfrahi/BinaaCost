"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCostDatabases } from "@/hooks/useCostDatabases";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { sanitizeText } from "@/utils/sanitizeText";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit2, Trash2, Plus, Search, X } from "lucide-react";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { PaginationControls } from "@/components/PaginationControls";
import { TranslatedSelect } from "@/components/TranslatedSelect";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("pages:cost_databases.title")}
        </h1>
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selection.allSelected}
                    onCheckedChange={selection.toggleAll}
                  />
                </TableHead>
                <TableHead>{t("common:name")}</TableHead>
                <TableHead>{t("common:description")}</TableHead>
                <TableHead>{t("common:currency")}</TableHead>
                <TableHead>{t("pages:cost_databases.public")}</TableHead>
                <TableHead className="w-24">{t("common:actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDatabases.map((db) => (
                <TableRow key={db.id}>
                  <TableCell>
                    <Checkbox
                      checked={selection.isSelected(db.id)}
                      onCheckedChange={() => selection.toggle(db.id)}
                    />
                  </TableCell>
                  <TableCell>{db.name}</TableCell>
                  <TableCell>
                    {db.description || t("common:notSpecified")}
                  </TableCell>
                  <TableCell>{db.currency}</TableCell>
                  <TableCell>
                    <Checkbox checked={db.is_public} disabled />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
              ))}
              {paginatedDatabases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t("common:noItems")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingId === "new" ? t("common:add") : t("common:edit")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("common:name")}
                  </label>
                  <Input {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-sm mt-1">
                      {t(form.formState.errors.name.message!)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("common:description")}
                  </label>
                  <Textarea {...form.register("description")} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("common:currency")}
                  </label>
                  <TranslatedSelect
                    value={form.watch("currency")}
                    onValueChange={(val) => form.setValue("currency", val)}
                    options={currencies}
                    isLoading={isLoadingCurrencies}
                    placeholder={t("pages:cost_databases.selectCurrency")}
                    aria-label={t("common:currency")}
                    className="text-sm"
                  />
                  {form.formState.errors.currency && (
                    <p className="text-destructive text-sm mt-1">
                      {t(form.formState.errors.currency.message!)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_public"
                    checked={form.watch("is_public")}
                    onCheckedChange={(checked) =>
                      form.setValue("is_public", Boolean(checked))
                    }
                  />
                  <label htmlFor="is_public" className="text-sm">
                    {t("pages:cost_databases.public")}
                  </label>
                </div>
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
                    {editingId === "new" ? t("common:add") : t("common:update")}
                  </Button>
                </div>
              </form>
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
