import { useState, useCallback, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import { Plus, Edit2, Trash2, Package, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PaginationControls } from "@/shared/components/PaginationControls";
import { Assembly } from "@/features/cost-library/assemblies/types/assemblies";
import { useAssemblies, PAGE_SIZE_OPTIONS } from "@/features/cost-library/hooks/useAssemblies";
import { AssemblyForm } from "./AssemblyForm";
import { useAuth } from "@/features/auth";
import {
  TableCell,
  TableRow,
} from "@/shared/components/ui/table";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";

interface AssemblyFormDialogProps {
  onOpenChange: (open: boolean) => void;
  initialData?: Assembly | null;
  onSubmit: (
    data: Omit<Assembly, "id" | "user_id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  isSubmitting: boolean;
}

function AssemblyFormDialog({
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: AssemblyFormDialogProps) {
  const { t } = useTranslation(["resources", "common"]);

  const handleFormSubmit = async (values: any) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-muted space-y-3">
      <div className="flex justify-between items-center">
        <Heading level={3} className="text-foreground">
          {initialData ? t("common:edit") : t("common:add")}{" "}
          {t("resources:assemblies.assembly")}
        </Heading>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label={t("common:close")}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
      <AssemblyForm
        initialData={initialData}
        onSubmit={handleFormSubmit}
        onCancel={() => onOpenChange(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export function AssemblyList({
  onSelectAssembly,
}: {
  onSelectAssembly: (assemblyId: string) => void;
}) {
  const { t } = useTranslation(["resources", "common"]);
  const {
    assemblies,
    isLoading,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    createAssembly,
    updateAssembly,
    deleteAssembly,
  } = useAssemblies();
  const { user } = useAuth();

  // Item counts per assembly, fetched once and grouped client-side.
  const { data: itemCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["assembly_item_counts", user?.id],
    queryFn: async () => {
      const records = await pb.collection("cost_assembly_items").getFullList({
        fields: "assembly_id",
      });
      const counts: Record<string, number> = {};
      for (const r of records) {
        counts[r.assembly_id] = (counts[r.assembly_id] || 0) + 1;
      }
      return counts;
    },
    enabled: !!user?.id,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assembly | null>(null);

  const handleCreateOrUpdate = useCallback(
    async (
      values: Omit<Assembly, "id" | "user_id" | "created_at" | "updated_at">,
    ) => {
      if (!user?.id) {
        toast.error(t("common:mustBeLoggedIn"));
        throw new Error(t("common:mustBeLoggedIn"));
      }
      try {
        if (editingAssembly) {
          await updateAssembly.mutateAsync({
            id: editingAssembly.id,
            ...values,
          });
        } else {
          await createAssembly.mutateAsync({ ...values, user_id: user.id });
        }
        toast.success(t("common:success"));
      } catch (error: any) {
        toast.error(error.message);
        throw error;
      }
    },
    [createAssembly, editingAssembly, t, updateAssembly, user?.id],
  );

  const openForm = useCallback((assembly?: Assembly) => {
    setEditingAssembly(assembly || null);
    setIsFormOpen(true);
  }, []);

  const columns = useMemo<DataTableColumn<Assembly>[]>(
    () => [
      { key: "name", label: t("resources:assemblies.name") },
      { key: "description", label: t("common:description") },
      { key: "category", label: t("resources:assemblies.category") },
      { key: "items", label: t("resources:assemblies.items"), align: "end" },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Input
              placeholder={t("common:searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => setPageSize(Number(val))}
          >
            <SelectTrigger className="w-[80px] text-sm">
              <SelectValue>
                {pageSize.toString()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem
                  key={size}
                  value={size.toString()}
                  className="text-sm"
                >
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isFormOpen && (
          <Button
            onClick={() => openForm()}
            size="icon"
            aria-label={t("common:add")}
            className="text-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {isFormOpen && (
        <AssemblyFormDialog
          onOpenChange={setIsFormOpen}
          initialData={editingAssembly}
          onSubmit={handleCreateOrUpdate}
          isSubmitting={createAssembly.isPending || updateAssembly.isPending}
        />
      )}

      <DataTable
        columns={columns}
        data={assemblies}
        getRowKey={(assembly) => assembly.id}
        renderRow={(assembly) => (
          <TableRow key={assembly.id}>
            <TableCell className="font-medium text-start text-sm text-foreground">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" aria-hidden="true" />
                {assembly.name}
              </div>
            </TableCell>
            <TableCell className="text-start text-sm text-foreground">
              {assembly.description || t("common:noDescription")}
            </TableCell>
            <TableCell className="text-start text-sm text-foreground">
              {assembly.category || t("common:notSpecified")}
            </TableCell>
            <TableCell className="text-end text-sm tabular-nums text-foreground">
              {itemCounts[assembly.id] ?? 0}
            </TableCell>
            <TableCell className="text-end text-sm">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSelectAssembly(assembly.id)}
                  aria-label={`${t("common:view")} ${assembly.name}`}
                  className="h-7 w-7"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openForm(assembly);
                  }}
                  aria-label={`${t("common:edit")} ${assembly.name}`}
                  className="h-7 w-7"
                >
                  <Edit2 className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(assembly);
                  }}
                  aria-label={`${t("common:delete")} ${assembly.name}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
        isLoading={isLoading}
        emptyMessage={t("common:noItems")}
        ariaLabel={t("resources:assemblies.assembly")}
      />

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget && deleteAssembly.mutateAsync({ id: deleteTarget.id })
        }
        itemName={deleteTarget?.name}
        loading={deleteAssembly.isPending}
      />
    </div>
  );
}
