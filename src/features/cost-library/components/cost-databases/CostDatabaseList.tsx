

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useCostDatabases } from "@/features/cost-library/hooks/useCostDatabases";
import { useAuth } from "@/features/auth";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { toast } from "sonner";
import { Heading } from "@/shared/components/ui/heading";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import { Edit2, Trash2, Plus } from "lucide-react";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PaginationControls } from "@/shared/components/PaginationControls";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";
import { CostDatabase } from "@/features/cost-library/databases/types/databases";
import {
  CostDatabaseForm,
  type CostDatabaseFormValues,
} from "./CostDatabaseForm";

interface CostDatabaseListProps {
  onViewDatabase: (id: string) => void;
}

export default function CostDatabaseList({
  onViewDatabase,
}: CostDatabaseListProps) {
  const { t } = useTranslation(["resources", "common", "pages"]);
  const { user } = useAuth();
  const { databasesQuery, createDatabase, updateDatabase, deleteDatabase } =
    useCostDatabases();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data: databases = [] } = databasesQuery;

  const editingDatabase = useMemo(() => {
    if (!editingId || editingId === "new") return null;
    return databases.find((d) => d.id === editingId) || null;
  }, [editingId, databases]);

  const filteredDatabases = databases.filter(
    (db) =>
      db.name.toLowerCase().includes(search.toLowerCase()) ||
      (db.description &&
        db.description.toLowerCase().includes(search.toLowerCase())),
  );

  const count = filteredDatabases.length;

  const paginatedDatabases = filteredDatabases.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  const totalPages = Math.ceil(count / pageSize);

  useEffect(() => {
    setCurrentPage(0);
  }, [search, pageSize]);

  const handleSubmit = useCallback(
    async (values: CostDatabaseFormValues) => {
      if (!user?.id) {
        toast.error(t("common:mustBeLoggedIn"));
        return;
      }

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
            user_id: user.id,
          });
          toast.success(t("common:success"));
        }
        setEditingId(null);
      } catch (error) {
        toast.error(t("common:error"));
      }
    },
    [editingId, updateDatabase, createDatabase, t, user?.id],
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
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <Heading level={1}>
          {t("resources:databases")}
        </Heading>
        <div className="flex items-center gap-2">
          {selection.hasSelection && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4" />
              {t("common:delete")}
            </Button>
          )}
          {!editingId && (
            <Button
              onClick={() => setEditingId("new")}
              size="icon"
              aria-label={t("common:add")}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {editingId && (
        <CostDatabaseForm
          initialData={editingDatabase}
          onSubmit={handleSubmit}
          onCancel={() => setEditingId(null)}
          isSubmitting={createDatabase.isPending || updateDatabase.isPending}
        />
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
          {t("common:item", { count })}
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
        emptyMessage={t("common:noItems")}
        ariaLabel={t("resources:databases")}
      />

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

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
