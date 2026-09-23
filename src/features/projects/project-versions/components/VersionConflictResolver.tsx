import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";
import { Risk, ProjectGroup } from "@/features/projects/project-core/types/project";
import { AnyItem, CategoryKey, CATEGORY_KEYS, compareItems, getItemIdentifier } from "../utils/versionDiff";
import { ConflictCategorySection } from "./ConflictCategorySection";

import { ResolutionMap } from "../types";

interface VersionConflictResolverProps {
  currentData: {
    materials: MaterialItem[];
    labor: LaborItem[];
    equipment: EquipmentItem[];
    additional: AdditionalCostItem[];
    risks: Risk[];
    groups: ProjectGroup[];
  };
  versionData: {
    materials: MaterialItem[];
    labor: LaborItem[];
    equipment: EquipmentItem[];
    additional: AdditionalCostItem[];
    risks: Risk[];
    groups: ProjectGroup[];
  };
  onResolve: (resolution: ResolutionMap) => void;
  onCancel: () => void;
  isRestoring: boolean;
  currentCurrency?: string;
  versionCurrency?: string;
  materialUnits: { value: string; label: string }[];
  periodUnits: { value: string; label: string }[];
  additionalCategories: { value: string; label: string }[];
  riskProbabilities: { value: string; label: string }[];
}


export default function VersionConflictResolver({
  currentData,
  versionData,
  onResolve,
  onCancel,
  isRestoring,
  currentCurrency = "USD",
  versionCurrency = "USD",
  materialUnits,
  periodUnits,
  additionalCategories,
  riskProbabilities,
}: VersionConflictResolverProps) {
  const { t } = useTranslation([
    "project_versions",
    "common",
    "project_detail",
    "project_equipment",
    "project_tabs",
  ]);
  const { format: formatCurrency } = useCurrencyFormatter();

  const [activeTab, setActiveTab] = useState<CategoryKey>("groups");
  const [selectedResolution, setSelectedResolution] = useState<ResolutionMap>({
    materials: { toAdd: [], toRemove: [], toUpdate: [] },
    labor: { toAdd: [], toRemove: [], toUpdate: [] },
    equipment: { toAdd: [], toRemove: [], toUpdate: [] },
    additional: { toAdd: [], toRemove: [], toUpdate: [] },
    risks: { toAdd: [], toRemove: [], toUpdate: [] },
    groups: { toAdd: [], toRemove: [], toUpdate: [] },
  });

  const allOptions = useMemo(
    () => ({
      material_unit: materialUnits,
      equipment_period_unit: periodUnits,
      additional_cost_category: additionalCategories,
      risk_probability: riskProbabilities,
    }),
    [materialUnits, periodUnits, additionalCategories, riskProbabilities],
  );

  useEffect(() => {
    const initialResolution: ResolutionMap = {
      materials: { toAdd: [], toRemove: [], toUpdate: [] },
      labor: { toAdd: [], toRemove: [], toUpdate: [] },
      equipment: { toAdd: [], toRemove: [], toUpdate: [] },
      additional: { toAdd: [], toRemove: [], toUpdate: [] },
      risks: { toAdd: [], toRemove: [], toUpdate: [] },
      groups: { toAdd: [], toRemove: [], toUpdate: [] },
    };

    CATEGORY_KEYS.forEach((category) => {
      const { onlyInVersion } = compareItems(
        currentData[category],
        versionData[category],
        category,
      );

      initialResolution[category].toAdd = onlyInVersion as never[];
    });

    setSelectedResolution(initialResolution);
  }, [currentData, versionData]);

  const handleToggleResolution = useCallback(
    (
      item: AnyItem,
      type: CategoryKey,
      action: "add" | "remove" | "update" | "keep_current" | "ignore",
    ) => {
      setSelectedResolution((prev) => {
        const newResolution = { ...prev };

        switch (type) {
          case "materials": {
            const res = newResolution.materials;
            res.toAdd = res.toAdd.filter((i) => i.id !== item.id);
            res.toRemove = res.toRemove.filter((id) => id !== item.id);
            res.toUpdate = res.toUpdate.filter((i) => i.id !== item.id);
            if (action === "add") res.toAdd.push(item as MaterialItem);
            else if (action === "remove") res.toRemove.push(item.id);
            else if (action === "update") {
              const versionItem = versionData.materials.find(
                (vItem) =>
                  getItemIdentifier(vItem, type) ===
                  getItemIdentifier(item, type),
              );
              if (versionItem) res.toUpdate.push(versionItem);
            }
            break;
          }
          case "labor": {
            const res = newResolution.labor;
            res.toAdd = res.toAdd.filter((i) => i.id !== item.id);
            res.toRemove = res.toRemove.filter((id) => id !== item.id);
            res.toUpdate = res.toUpdate.filter((i) => i.id !== item.id);
            if (action === "add") res.toAdd.push(item as LaborItem);
            else if (action === "remove") res.toRemove.push(item.id);
            else if (action === "update") {
              const versionItem = versionData.labor.find(
                (vItem) =>
                  getItemIdentifier(vItem, type) ===
                  getItemIdentifier(item, type),
              );
              if (versionItem) res.toUpdate.push(versionItem);
            }
            break;
          }
          case "equipment": {
            const res = newResolution.equipment;
            res.toAdd = res.toAdd.filter((i) => i.id !== item.id);
            res.toRemove = res.toRemove.filter((id) => id !== item.id);
            res.toUpdate = res.toUpdate.filter((i) => i.id !== item.id);
            if (action === "add") res.toAdd.push(item as EquipmentItem);
            else if (action === "remove") res.toRemove.push(item.id);
            else if (action === "update") {
              const versionItem = versionData.equipment.find(
                (vItem) =>
                  getItemIdentifier(vItem, type) ===
                  getItemIdentifier(item, type),
              );
              if (versionItem) res.toUpdate.push(versionItem);
            }
            break;
          }
          case "additional": {
            const res = newResolution.additional;
            res.toAdd = res.toAdd.filter((i) => i.id !== item.id);
            res.toRemove = res.toRemove.filter((id) => id !== item.id);
            res.toUpdate = res.toUpdate.filter((i) => i.id !== item.id);
            if (action === "add") res.toAdd.push(item as AdditionalCostItem);
            else if (action === "remove") res.toRemove.push(item.id);
            else if (action === "update") {
              const versionItem = versionData.additional.find(
                (vItem) =>
                  getItemIdentifier(vItem, type) ===
                  getItemIdentifier(item, type),
              );
              if (versionItem) res.toUpdate.push(versionItem);
            }
            break;
          }
          case "risks": {
            const res = newResolution.risks;
            res.toAdd = res.toAdd.filter((i) => i.id !== item.id);
            res.toRemove = res.toRemove.filter((id) => id !== item.id);
            res.toUpdate = res.toUpdate.filter((i) => i.id !== item.id);
            if (action === "add") res.toAdd.push(item as Risk);
            else if (action === "remove") res.toRemove.push(item.id);
            else if (action === "update") {
              const versionItem = versionData.risks.find(
                (vItem) =>
                  getItemIdentifier(vItem, type) ===
                  getItemIdentifier(item, type),
              );
              if (versionItem) res.toUpdate.push(versionItem);
            }
            break;
          }
          case "groups": {
            const res = newResolution.groups;
            res.toAdd = res.toAdd.filter((i) => i.id !== item.id);
            res.toRemove = res.toRemove.filter((id) => id !== item.id);
            res.toUpdate = res.toUpdate.filter((i) => i.id !== item.id);
            if (action === "add") res.toAdd.push(item as ProjectGroup);
            else if (action === "remove") res.toRemove.push(item.id);
            else if (action === "update") {
              const versionItem = versionData.groups.find(
                (vItem) =>
                  getItemIdentifier(vItem, type) ===
                  getItemIdentifier(item, type),
              );
              if (versionItem) res.toUpdate.push(versionItem);
            }
            break;
          }
        }
        return newResolution;
      });
    },
    [versionData],
  );



  const handleApplyResolution = () => {
    onResolve(selectedResolution);
  };

  const totalChanges = useMemo(() => {
    let count = 0;
    CATEGORY_KEYS.forEach((category) => {
      count += selectedResolution[category].toAdd.length;
      count += selectedResolution[category].toRemove.length;
      count += selectedResolution[category].toUpdate.length;
    });
    return count;
  }, [selectedResolution]);

  const changeSummary = useMemo(() => {
    let added = 0;
    let removed = 0;
    let updated = 0;
    CATEGORY_KEYS.forEach((category) => {
      added += selectedResolution[category].toAdd.length;
      removed += selectedResolution[category].toRemove.length;
      updated += selectedResolution[category].toUpdate.length;
    });
    return { added, removed, updated };
  }, [selectedResolution]);

  return (
    <div className="space-y-6 text-sm">
      {currentCurrency !== versionCurrency && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-base">{t("common:warning")}</AlertTitle>
          <AlertDescription className="text-sm">
            {t("project_versions:currencyMismatchWarning", {
              current: currentCurrency,
              version: versionCurrency,
            })}
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as CategoryKey)}
      >
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <TabsList className="w-full justify-start">
            {CATEGORY_KEYS.map((key) => (
              <TabsTrigger key={key} value={key} className="text-sm">
                {t(`project_tabs:${key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {CATEGORY_KEYS.map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <ConflictCategorySection
              category={key}
              currentItems={currentData[key]}
              versionItems={versionData[key]}
              selectedResolution={selectedResolution}
              onToggleResolution={handleToggleResolution}
              formatCurrency={formatCurrency}
              currentCurrency={currentCurrency}
              versionCurrency={versionCurrency}
              t={t}
              allOptions={allOptions}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <div className="flex-1 self-center text-xs text-muted-foreground">
          {t("project_versions:changeSummary", {
            added: changeSummary.added,
            removed: changeSummary.removed,
            updated: changeSummary.updated,
          })}
        </div>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isRestoring}
          className="text-sm"
        >
          {t("common:cancel")}
        </Button>
        <Button
          onClick={handleApplyResolution}
          disabled={isRestoring || totalChanges === 0}
          className="text-sm"
        >
          {isRestoring ? (
            <>
              <Loader2 className="w-4 h-4 ms-2 animate-spin" />
              {t("common:applying")}
            </>
          ) : (
            t("project_versions:applyChanges")
          )}
        </Button>
      </div>
    </div>
  );
}
