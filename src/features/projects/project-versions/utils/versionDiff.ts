import { Decimal } from "@/shared/lib/math";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";
import { Risk, ProjectGroup } from "@/features/projects/project-core/types/project";
import { TFunction } from "i18next";

export const CATEGORY_KEYS = [
  "groups",
  "materials",
  "labor",
  "equipment",
  "additional",
  "risks",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type AnyItem =
  | MaterialItem
  | LaborItem
  | EquipmentItem
  | AdditionalCostItem
  | Risk
  | ProjectGroup;

export const getItemIdentifier = (item: AnyItem, type: CategoryKey): string => {
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

export const areItemsEqual = (
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

export const getDisplayLabel = (item: AnyItem, type: CategoryKey, t: TFunction): string => {
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

export const compareItems = (currentItems: AnyItem[], versionItems: AnyItem[], type: CategoryKey) => {
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
};
