import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Package, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationControls } from "@/components/PaginationControls";
import { Assembly } from "@/types/assemblies";
import { useAssemblies, PAGE_SIZE_OPTIONS } from "@/hooks/useAssemblies";
import { AssemblyForm } from "./AssemblyForm";
import { useAuth } from "@/components/AuthProvider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <h3 className="font-semibold text-lg text-text-primary">
          {initialData ? t("common:edit") : t("common:add")}{" "}
          {t("resources:assemblies.assembly")}
        </h3>
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

  const headerClass =
    "text-xs font-semibold text-text-secondary uppercase tracking-wider bg-muted h-10 px-3 py-2";

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
              <SelectValue />
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

      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={`${headerClass} text-start`}>
                {t("resources:assemblies.name")}
              </TableHead>
              <TableHead className={`${headerClass} text-start`}>
                {t("common:description")}
              </TableHead>
              <TableHead className={`${headerClass} text-start`}>
                {t("resources:assemblies.category")}
              </TableHead>
              <TableHead className={`${headerClass} text-end`}>
                {t("resources:assemblies.items")}
              </TableHead>
              <TableHead className={`${headerClass} text-end`}>
                {t("common:actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : assemblies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-text-secondary text-sm"
                >
                  {t("common:noItems")}
                </TableCell>
              </TableRow>
            ) : (
              assemblies.map((assembly) => (
                <TableRow key={assembly.id} className="border-t border-border">
                  <TableCell className="font-medium text-start text-sm text-text-primary">
                    <div className="flex items-center gap-2">
                      <Package
                        className="w-4 h-4 text-primary"
                        aria-hidden="true"
                      />
                      {assembly.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-start text-sm text-text-primary">
                    {assembly.description || t("common:noDescription")}
                  </TableCell>
                  <TableCell className="text-start text-sm text-text-primary">
                    {assembly.category || t("common:notSpecified")}
                  </TableCell>
                  <TableCell className="text-end text-sm tabular-nums text-text-primary">
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
