
import { useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import EmptyState from "@/shared/components/ui/EmptyState";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Loader2, X, PackagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  AssemblyItem,
  AssemblyLaborDetails,
  AssemblyEquipmentDetails,
  AssemblyAdditionalCostDetails,
} from "@/features/cost-library/assemblies/types/assemblies";
import { Label } from "@/shared/components/ui/label";
import { useAssemblies } from "@/features/cost-library/hooks/useAssemblies";
import { useAssemblyItems } from "@/features/cost-library/hooks/useAssemblyItems";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { useAssemblyImport } from "@/features/projects/project-costs/hooks/useAssemblyImport";

export default function AssemblyImporter({
  projectId,
  onCancel,
}: {
  projectId: string;
  onCancel: () => void;
}) {
  const { t } = useTranslation([
    "project_detail",
    "common",
    "project_tabs",
    "project_equipment",
  ]);
  const { format: formatCurrencyValue } = useCurrencyFormatter();

  const { allAssemblies: availableAssemblies, isLoading: isLoadingAssemblies } =
    useAssemblies();
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(
    null,
  );
  const [takeoffQuantity, setTakeoffQuantity] = useState<number>(1);
  const scale = Number(takeoffQuantity) > 0 ? Number(takeoffQuantity) : 1;

  const {
    itemsQuery: { data: assemblyItems = [], isLoading: isLoadingAssemblyItems },
  } = useAssemblyItems(selectedAssemblyId || undefined);

  const { importAssemblyItems, isImporting, isLoadingProject } =
    useAssemblyImport(projectId);

  const { options: materialUnits } = useSettingsOptions("material_unit");
  const { options: periodUnits } = useSettingsOptions("equipment_period_unit");
  const { options: additionalCategories } = useSettingsOptions(
    "additional_cost_category",
  );

  const getTranslatedUnitDisplay = useCallback(
    (item: AssemblyItem, scaleFactor: number = 1) => {
      const formattedPrice = formatCurrencyValue(item.unit_price, "USD");
      switch (item.item_type) {
        case "material": {
          const materialUnitLabel =
            materialUnits.find((u) => u.value === item.unit)?.label ||
            item.unit ||
            t("common:unit");
          const scaledQty = Number((item.quantity * scaleFactor).toFixed(4));
          return (
            <bdi>
              {`${scaledQty} ${materialUnitLabel} @ ${formattedPrice}`}
            </bdi>
          );
        }
        case "labor": {
          const laborDetails = item.details as AssemblyLaborDetails | null;
          const scaledDays = Number(
            ((laborDetails?.total_days ?? 1) * scaleFactor).toFixed(2),
          );
          return (
            <bdi>
              {`${item.quantity} ${t("project_detail:reports.workersUnit")} × ${scaledDays} ${t("project_equipment:Day")} @ ${formattedPrice}`}
            </bdi>
          );
        }
        case "equipment": {
          const equipmentUnitLabel =
            periodUnits.find((u) => u.value === item.unit)?.label ||
            item.unit ||
            t("project_equipment:Day");
          const equipDetails = item.details as AssemblyEquipmentDetails | null;
          const scaledDuration = Number(
            ((equipDetails?.usage_duration ?? 1) * scaleFactor).toFixed(2),
          );
          return (
            <bdi>
              {`${item.quantity} ${equipmentUnitLabel} × ${scaledDuration} @ ${formattedPrice}`}
            </bdi>
          );
        }
        case "additional": {
          return (
            <bdi>
              {`${scaleFactor} ${t("common:each")} @ ${formattedPrice}`}
            </bdi>
          );
        }
        default: {
          const scaledQty = Number((item.quantity * scaleFactor).toFixed(4));
          return (
            <bdi>
              {`${scaledQty} ${item.unit || t("common:unit")} @ ${formattedPrice}`}
            </bdi>
          );
        }
      }
    },
    [formatCurrencyValue, materialUnits, periodUnits, t],
  );

  const handleImport = useCallback(async () => {
    if (!selectedAssemblyId || assemblyItems.length === 0) return;

    try {
      await importAssemblyItems({
        assemblyItems,
        scaleFactor: scale,
      });
      onCancel();
    } catch (error: any) {
      console.error("Error during assembly import:", error);
    }
  }, [selectedAssemblyId, assemblyItems, importAssemblyItems, scale, onCancel]);

  const isLoadingAny =
    isLoadingProject ||
    isLoadingAssemblies ||
    isLoadingAssemblyItems ||
    isImporting;

  return (
    <div className="border rounded-lg p-4 bg-muted mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <Heading level={3} className="text-foreground">
          {t("project_detail:assembly_importer.importFromAssembly")}
        </Heading>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label={t("common:close")}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="select-assembly" className="text-sm">
            {t("project_detail:assembly_importer.selectAssembly")}
          </Label>
          <Select
            value={selectedAssemblyId || ""}
            onValueChange={setSelectedAssemblyId}
            disabled={isLoadingAssemblies || isImporting}
          >
            <SelectTrigger id="select-assembly" className="text-sm">
              <SelectValue
                placeholder={t(
                  "project_detail:assembly_importer.selectAssemblyPlaceholder",
                )}
              >
                {availableAssemblies.find((a) => a.id === selectedAssemblyId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {isLoadingAssemblies ? (
                <SelectItem value="loading" disabled className="text-sm">
                  {t("common:loading")}
                </SelectItem>
              ) : availableAssemblies.length === 0 ? (
                <SelectItem value="no-assemblies" disabled className="text-sm">
                  {t("project_detail:assembly_importer.noAssemblies")}
                </SelectItem>
              ) : (
                availableAssemblies.map((assembly) => (
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
        </div>

        {selectedAssemblyId && (
          <div>
            <Label htmlFor="takeoff-quantity" className="text-sm font-medium">
              {t("project_detail:assembly_importer.takeoffQuantity")}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="takeoff-quantity"
                type="number"
                min="0.0001"
                step="any"
                value={takeoffQuantity}
                onChange={(e) =>
                  setTakeoffQuantity(parseFloat(e.target.value) || 0)
                }
                placeholder={t(
                  "project_detail:assembly_importer.takeoffQuantityPlaceholder",
                )}
                className="w-40 text-sm"
              />
              <span className="text-xs text-muted-foreground">
                × {scale} {t("project_detail:assembly_importer.scaleFactor")}
              </span>
            </div>
          </div>
        )}

        {selectedAssemblyId && (
          <div className="border rounded-md bg-card">
            <div className="bg-muted px-4 py-2 border-b">
              <span className="text-sm font-medium">
                {t("project_detail:assembly_importer.itemsInAssembly")} (
                {assemblyItems.length})
              </span>
            </div>
            <ScrollArea className="h-48">
              {isLoadingAssemblyItems ? (
                <LoadingState label={t("common:loading")} />
              ) : assemblyItems.length === 0 ? (
                <EmptyState message={t("common:noItems")} />
              ) : (
                <ul className="divide-y divide-border">
                  {assemblyItems.map((item) => (
                    <li key={item.id} className="px-4 py-2 text-sm">
                      <span className="font-medium capitalize">
                        {t(`project_tabs:${item.item_type}`)}:
                      </span>{" "}
                      {item.item_type === "additional"
                        ? `${additionalCategories.find((c) => c.value === (item.details as AssemblyAdditionalCostDetails)?.category)?.label || (item.details as AssemblyAdditionalCostDetails)?.category || t("common:notSpecified")}: ${item.description}`
                        : item.description}{" "}
                      {getTranslatedUnitDisplay(item, scale)}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoadingAny}
            className="text-sm"
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={
              !selectedAssemblyId || assemblyItems.length === 0 || isLoadingAny
            }
            className="text-sm"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                {t("common:importing")}
              </>
            ) : (
              <>
                <PackagePlus className="w-4 h-4 ms-2" />
                {t("project_detail:assembly_importer.importItems")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
