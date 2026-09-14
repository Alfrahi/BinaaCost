import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Plus, Minus, Pencil, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Decimal } from "@/utils/math";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
  Risk,
  ProjectGroup,
} from "@/types/project-items";

type AnyItem =
  | MaterialItem
  | LaborItem
  | EquipmentItem
  | AdditionalCostItem
  | Risk
  | ProjectGroup;

export interface ResolutionMap {
  materials: {
    toAdd: MaterialItem[];
    toRemove: string[];
    toUpdate: MaterialItem[];
  };
  labor: {
    toAdd: LaborItem[];
    toRemove: string[];
    toUpdate: LaborItem[];
  };
  equipment: {
    toAdd: EquipmentItem[];
    toRemove: string[];
    toUpdate: EquipmentItem[];
  };
  additional: {
    toAdd: AdditionalCostItem[];
    toRemove: string[];
    toUpdate: AdditionalCostItem[];
  };
  risks: {
    toAdd: Risk[];
    toRemove: string[];
    toUpdate: Risk[];
  };
  groups: {
    toAdd: ProjectGroup[];
    toRemove: string[];
    toUpdate: ProjectGroup[];
  };
}

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

const CATEGORY_KEYS = [
  "groups",
  "materials",
  "labor",
  "equipment",
  "additional",
  "risks",
] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

const getItemIdentifier = (item: AnyItem, type: CategoryKey): string => {
  switch (type) {
    case "materials":
      return (item as MaterialItem).name + (item as MaterialItem).unit;
    case "labor":
      return (item as LaborItem).worker_type;
    case "equipment":
      return (
        (item as EquipmentItem).name +
        (item as EquipmentItem).type +
        (item as EquipmentItem).rental_or_purchase +
        (item as EquipmentItem).period_unit
      );
    case "additional":
      return (
        (item as AdditionalCostItem).category +
        (item as AdditionalCostItem).description
      );
    case "risks":
      return (item as Risk).description;
    case "groups":
      return (item as ProjectGroup).name;
    default:
      return item.id;
  }
};

const areItemsEqual = (
  item1: AnyItem,
  item2: AnyItem,
  type: CategoryKey,
): boolean => {
  if (!item1 || !item2) return false;

  const compareField = (val1: any, val2: any) => {
    if (val1 === null && val2 === undefined) return true;
    if (val1 === undefined && val2 === null) return true;
    return val1 === val2;
  };

  const compareNumericField = (
    val1: number | undefined | null,
    val2: number | undefined | null,
  ) => {
    const dec1 = new Decimal(val1 || 0);
    const dec2 = new Decimal(val2 || 0);
    return dec1.eq(dec2);
  };

  switch (type) {
    case "materials": {
      const m1 = item1 as MaterialItem;
      const m2 = item2 as MaterialItem;
      return (
        compareField(m1.name, m2.name) &&
        compareField(m1.description, m2.description) &&
        compareNumericField(m1.quantity, m2.quantity) &&
        compareField(m1.unit, m2.unit) &&
        compareNumericField(m1.unit_price, m2.unit_price) &&
        compareField(m1.group_id, m2.group_id)
      );
    }
    case "labor": {
      const l1 = item1 as LaborItem;
      const l2 = item2 as LaborItem;
      return (
        compareField(l1.worker_type, l2.worker_type) &&
        compareNumericField(l1.number_of_workers, l2.number_of_workers) &&
        compareNumericField(l1.daily_rate, l2.daily_rate) &&
        compareNumericField(l1.total_days, l2.total_days) &&
        compareField(l1.group_id, l2.group_id)
      );
    }
    case "equipment": {
      const e1 = item1 as EquipmentItem;
      const e2 = item2 as EquipmentItem;
      return (
        compareField(e1.name, e2.name) &&
        compareField(e1.type, e2.type) &&
        compareField(e1.rental_or_purchase, e2.rental_or_purchase) &&
        compareNumericField(e1.quantity, e2.quantity) &&
        compareNumericField(e1.cost_per_period, e2.cost_per_period) &&
        compareField(e1.period_unit, e2.period_unit) &&
        compareNumericField(e1.usage_duration, e2.usage_duration) &&
        compareNumericField(e1.maintenance_cost, e2.maintenance_cost) &&
        compareNumericField(e1.fuel_cost, e2.fuel_cost) &&
        compareField(e1.group_id, e2.group_id)
      );
    }
    case "additional": {
      const a1 = item1 as AdditionalCostItem;
      const a2 = item2 as AdditionalCostItem;
      return (
        compareField(a1.category, a2.category) &&
        compareField(a1.description, a2.description) &&
        compareNumericField(a1.amount, a2.amount) &&
        compareField(a1.group_id, a2.group_id)
      );
    }
    case "risks": {
      const r1 = item1 as Risk;
      const r2 = item2 as Risk;
      return (
        compareField(r1.description, r2.description) &&
        compareField(r1.probability, r2.probability) &&
        compareNumericField(r1.impact_amount, r2.impact_amount) &&
        compareField(r1.mitigation_plan, r2.mitigation_plan) &&
        compareNumericField(r1.contingency_amount, r2.contingency_amount)
      );
    }
    case "groups": {
      const g1 = item1 as ProjectGroup;
      const g2 = item2 as ProjectGroup;
      return (
        compareField(g1.name, g2.name) &&
        compareNumericField(g1.sort_order, g2.sort_order)
      );
    }
    default:
      return false;
  }
};

const getDisplayLabel = (item: AnyItem, type: CategoryKey, t: any): string => {
  switch (type) {
    case "materials":
      return (item as MaterialItem).name;
    case "labor":
      return (item as LaborItem).worker_type;
    case "equipment":
      return (item as EquipmentItem).name;
    case "additional":
      return `${(item as AdditionalCostItem).category}: ${(item as AdditionalCostItem).description || t("common:notSpecified")}`;
    case "risks":
      return (item as Risk).description;
    case "groups":
      return (item as ProjectGroup).name;
    default:
      return item.id;
  }
};

const getDetailsDisplay = (
  item: AnyItem,
  type: CategoryKey,
  t: any,
  formatCurrency: any,
  currency: string,
  options: any,
) => {
  switch (type) {
    case "materials": {
      const mat = item as MaterialItem;
      const unitLabel =
        options.material_unit.find((u: any) => u.value === mat.unit)?.label ||
        mat.unit;
      return (
        <bdi>
          {`${mat.quantity} ${unitLabel} @ ${formatCurrency(mat.unit_price, currency)}`}
        </bdi>
      );
    }
    case "labor": {
      const lab = item as LaborItem;
      return (
        <bdi>
          {`${lab.number_of_workers} ${t("project_detail:reports.workersUnit")} × ${lab.total_days} ${t("project_equipment:Day")} @ ${formatCurrency(lab.daily_rate, currency)}`}
        </bdi>
      );
    }
    case "equipment": {
      const eq = item as EquipmentItem;
      const periodUnitLabel =
        options.equipment_period_unit.find(
          (u: any) => u.value === eq.period_unit,
        )?.label || eq.period_unit;
      return (
        <bdi>
          {`${eq.quantity} ${periodUnitLabel} @ ${formatCurrency(eq.cost_per_period, currency)}`}
        </bdi>
      );
    }
    case "additional": {
      const add = item as AdditionalCostItem;
      return (
        <bdi>
          {formatCurrency(add.amount, currency)}
        </bdi>
      );
    }
    case "risks": {
      const risk = item as Risk;
      const probLabel =
        options.risk_probability.find((p: any) => p.value === risk.probability)
          ?.label || risk.probability;
      return (
        <bdi>
          {`${probLabel} - Impact: ${formatCurrency(risk.impact_amount, currency)}`}
        </bdi>
      );
    }
    case "groups":
      return (
        <bdi>
          {`Order: ${(item as ProjectGroup).sort_order}`}
        </bdi>
      );
    default:
      return (
        <bdi></bdi>
      );
  }
};

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

  const compareItems = useCallback(
    (currentItems: AnyItem[], versionItems: AnyItem[], type: CategoryKey) => {
      const currentMap = new Map(
        currentItems.map((item) => [getItemIdentifier(item, type), item]),
      );
      const versionMap = new Map(
        versionItems.map((item) => [getItemIdentifier(item, type), item]),
      );

      const onlyInCurrent: AnyItem[] = [];
      const onlyInVersion: AnyItem[] = [];
      const modifiedInBoth: { current: AnyItem; version: AnyItem }[] = [];
      const unchangedInBoth: AnyItem[] = [];

      for (const currentItem of currentItems) {
        const identifier = getItemIdentifier(currentItem, type);
        if (versionMap.has(identifier)) {
          const versionItem = versionMap.get(identifier)!;
          if (areItemsEqual(currentItem, versionItem, type)) {
            unchangedInBoth.push(currentItem);
          } else {
            modifiedInBoth.push({ current: currentItem, version: versionItem });
          }
        } else {
          onlyInCurrent.push(currentItem);
        }
      }

      for (const versionItem of versionItems) {
        const identifier = getItemIdentifier(versionItem, type);
        if (!currentMap.has(identifier)) {
          onlyInVersion.push(versionItem);
        }
      }

      return { onlyInCurrent, onlyInVersion, modifiedInBoth, unchangedInBoth };
    },
    [],
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

      initialResolution[category].toAdd = onlyInVersion as any[];
    });

    setSelectedResolution(initialResolution);
  }, [currentData, versionData, compareItems]);

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

  const renderItemRow = (
    item: AnyItem,
    type: CategoryKey,
    status: "current_only" | "version_only" | "modified",
    versionItem?: AnyItem,
  ) => {
    const isAdded = selectedResolution[type].toAdd.some(
      (i) => i.id === item.id,
    );
    const isRemoved = selectedResolution[type].toRemove.includes(item.id);
    const isUpdated = selectedResolution[type].toUpdate.some(
      (i) => i.id === item.id,
    );

    const currentDisplay = getDisplayLabel(item, type, t);
    const currentDetails = getDetailsDisplay(
      item,
      type,
      t,
      formatCurrency,
      currentCurrency,
      allOptions,
    );
    const versionDetails = versionItem
      ? getDetailsDisplay(
          versionItem,
          type,
          t,
          formatCurrency,
          versionCurrency,
          allOptions,
        )
      : "";

    return (
      <TableRow key={item.id}>
        <TableCell className="p-2 text-sm">
          <div className="flex items-center gap-2">
            {status === "version_only" && (
              <Checkbox
                checked={isAdded}
                onCheckedChange={() =>
                  handleToggleResolution(item, type, isAdded ? "ignore" : "add")
                }
                aria-label={t("project_versions:add")}
              />
            )}
            {status === "current_only" && (
              <Checkbox
                checked={!isRemoved}
                onCheckedChange={() =>
                  handleToggleResolution(
                    item,
                    type,
                    isRemoved ? "keep_current" : "remove",
                  )
                }
                aria-label={t("project_versions:keepCurrent")}
              />
            )}
            {status === "modified" && (
              <Checkbox
                checked={!isUpdated}
                onCheckedChange={() =>
                  handleToggleResolution(
                    item,
                    type,
                    isUpdated ? "keep_current" : "update",
                  )
                }
                aria-label={t("project_versions:keepCurrent")}
              />
            )}
            <span
              className={cn(
                status === "current_only" &&
                  isRemoved &&
                  "line-through text-destructive",
                status === "version_only" &&
                  isAdded &&
                  "text-success font-medium",
                status === "modified" &&
                  isUpdated &&
                  "text-primary font-medium",
              )}
            >
              {currentDisplay}
            </span>
          </div>
        </TableCell>
        <TableCell className="p-2 text-sm text-muted-foreground">{currentDetails}</TableCell>
        <TableCell className="p-2 text-sm">
          {status === "version_only" && (
            <div className="flex items-center gap-2 text-success">
              <Plus className="w-4 h-4" /> {t("project_versions:status_added")}
            </div>
          )}
          {status === "current_only" && (
            <div className="flex items-center gap-2 text-destructive">
              <Minus className="w-4 h-4" />{" "}
              {t("project_versions:status_removed")}
            </div>
          )}
          {status === "modified" && (
            <div className="flex items-center gap-2 text-primary">
              <Pencil className="w-4 h-4" />{" "}
              {t("project_versions:status_modified")}
            </div>
          )}
        </TableCell>
        <TableCell className="p-2 text-sm text-muted-foreground">
          {status === "modified" && (
            <span className={cn(isUpdated && "text-primary font-medium")}>
              {versionDetails}
            </span>
          )}
          {status === "version_only" && (
            <span className={cn(isAdded && "text-success font-medium")}>
              {versionDetails}
            </span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const renderCategorySection = (category: CategoryKey) => {
    const { onlyInCurrent, onlyInVersion, modifiedInBoth } = compareItems(
      currentData[category],
      versionData[category],
      category,
    );

    const allItems = [
      ...onlyInVersion.map((item) => ({
        item,
        status: "version_only" as const,
        versionItem: item,
      })),
      ...modifiedInBoth.map(({ current, version }) => ({
        item: current,
        versionItem: version,
        status: "modified" as const,
      })),
      ...onlyInCurrent.map((item) => ({
        item,
        status: "current_only" as const,
        versionItem: undefined,
      })),
    ].sort((a, b) =>
      getDisplayLabel(a.item, category, t).localeCompare(
        getDisplayLabel(b.item, category, t),
      ),
    );

    return (
      <div className="space-y-4">
        {allItems.length === 0 ? (
          <EmptyState message={t("project_versions:noChangesInCategory")} />
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("project_versions:currentProject")}
                  </TableHead>
                  <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("project_versions:currentDetails")}
                  </TableHead>
                  <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("project_versions:changeType")}
                  </TableHead>
                  <TableHead className="w-1/4 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("project_versions:versionDetails")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map(({ item, versionItem, status }) =>
                  renderItemRow(item, category, status, versionItem),
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

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
            {renderCategorySection(key)}
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
