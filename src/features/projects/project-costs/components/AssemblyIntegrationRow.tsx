"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import EmptyState from "@/shared/components/ui/EmptyState";
import LoadingState from "@/shared/components/ui/LoadingState";
import { PackagePlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useAssemblies } from "@/features/cost-library/hooks/useAssemblies";
import { useAssemblyItems } from "@/features/projects/project-costs/hooks/useAssemblyItems";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { filterAssemblyItemsByType } from "@/shared/lib/assemblyUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export interface ImportItemOverrides {
  materials?: (items: any[]) => Promise<void>;
  labor?: (items: any[]) => Promise<void>;
  equipment?: (items: any[]) => Promise<void>;
  additional?: (items: any[]) => Promise<void>;
}

interface AssemblyIntegrationRowProps {
  /** Which item types this table accepts; others are filtered out of the preview */
  itemTypes: Array<"material" | "labor" | "equipment" | "additional">;
  /** Lazy import functions for the relevant item types (from each table's hook) */
  onImport: ImportItemOverrides;
}

/** Compact "Add from Assembly" picker that sits inside a cost table's quick-add area. */
export function AssemblyIntegrationRow({
  itemTypes,
  onImport,
}: AssemblyIntegrationRowProps) {
  const { t } = useTranslation(["project_detail", "common", "project_tabs"]);
  const { format } = useCurrencyFormatter();
  const { allAssemblies, isLoading: isLoadingAssemblies } = useAssemblies();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  const { itemsQuery: { data: allAssemblyItems = [], isLoading: isLoadingItems } } =
    useAssemblyItems(selectedId || undefined);

  const previewItems = useMemo(
    () => filterAssemblyItemsByType(allAssemblyItems, itemTypes),
    [allAssemblyItems, itemTypes],
  );

  const totalItems = previewItems.length;

  const handleImport = useCallback(async () => {
    if (!selectedId || previewItems.length === 0) return;
    setIsImporting(true);
    try {
      const byType: Record<string, any[]> = {};
      for (const item of previewItems) {
        const key = item.item_type;
        if (!byType[key]) byType[key] = [];
        byType[key].push(item);
      }
      for (const [type, items] of Object.entries(byType)) {
        const fn = onImport[type as keyof ImportItemOverrides];
        if (fn) {
          await fn(items);
        }
      }
      setSelectedId("");
      setOpen(false);
    } finally {
      setIsImporting(false);
    }
  }, [selectedId, previewItems, onImport]);

  if (!onImport || Object.keys(onImport).length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-11 text-sm"
        aria-label={t("project_detail:assembly_importer.addFromAssembly")}
      >
        <PackagePlus className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
        {t("project_detail:assembly_importer.addFromAssembly")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5" aria-hidden="true" />
              {t("project_detail:assembly_importer.importFromAssembly")}
            </DialogTitle>
            <DialogDescription>
              {t("project_detail:assembly_importer.pickAssembly")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="text-sm" id="assembly-select">
                <SelectValue
                  placeholder={t(
                    "project_detail:assembly_importer.selectAssemblyPlaceholder",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {isLoadingAssemblies ? (
                  <SelectItem value="__loading" disabled className="text-sm">
                    {t("common:loading")}
                  </SelectItem>
                ) : allAssemblies.length === 0 ? (
                  <SelectItem value="__none" disabled className="text-sm">
                    {t("project_detail:assembly_importer.noAssemblies")}
                  </SelectItem>
                ) : (
                  allAssemblies.map((assembly) => (
                    <SelectItem
                      key={assembly.id}
                      value={assembly.id}
                      className="text-sm"
                    >
                      {assembly.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedId && (
              <div className="border rounded-md bg-card">
                <div className="bg-muted px-4 py-2 border-b text-sm font-medium">
                  {t("project_detail:assembly_importer.itemsInAssembly")}: {totalItems}
                </div>
                {isLoadingItems ? (
                  <LoadingState />
                ) : previewItems.length === 0 ? (
                  <EmptyState message={t("project_detail:assembly_importer.noItemsOfType")} />
                ) : (
                  <ul className="divide-y divide-border max-h-[250px] overflow-y-auto">
                    {previewItems.map((item) => (
                      <li key={item.id} className="px-4 py-2 text-sm">
                        <span className="font-medium capitalize">
                          {t(`project_tabs:${item.item_type}`)}
                        </span>
                        {" "}— {item.description} —{" "}
                        {item.quantity} × {format(item.unit_price, "USD")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-sm"
            >
              {t("common:cancel")}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedId || previewItems.length === 0 || isImporting || isLoadingItems}
              className="text-sm"
            >
              {isImporting ? (
                <>
                  <Loader2 className={cn("w-4 h-4 animate-spin", getIconMarginClass())} />
                  {t("common:importing")}
                </>
              ) : (
                <>
                  <PackagePlus className={cn("w-4 h-4", getIconMarginClass())} />
                  {t("project_detail:assembly_importer.importItems")} ({totalItems})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}