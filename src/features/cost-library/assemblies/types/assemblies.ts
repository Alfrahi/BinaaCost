export interface Assembly {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssemblyMaterialDetails {
  description?: string;
  [key: string]: unknown;
}

export interface AssemblyLaborDetails {
  total_days: number;
}

export interface AssemblyEquipmentDetails {
  type?: string | null;
  rental_or_purchase: string;
  usage_duration: number;
  maintenance_cost?: number | null;
  fuel_cost?: number | null;
}

export interface AssemblyAdditionalCostDetails {
  category: string;
}

interface AssemblyItemBase {
  id: string;
  assembly_id: string;
  user_id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface AssemblyMaterialItem extends AssemblyItemBase {
  item_type: "material";
  details: AssemblyMaterialDetails | null;
}

export interface AssemblyLaborItem extends AssemblyItemBase {
  item_type: "labor";
  details: AssemblyLaborDetails | null;
}

export interface AssemblyEquipmentItem extends AssemblyItemBase {
  item_type: "equipment";
  details: AssemblyEquipmentDetails | null;
}

export interface AssemblyAdditionalItem extends AssemblyItemBase {
  item_type: "additional";
  details: AssemblyAdditionalCostDetails | null;
}

export type AssemblyItem =
  | AssemblyMaterialItem
  | AssemblyLaborItem
  | AssemblyEquipmentItem
  | AssemblyAdditionalItem;

export type AssemblyItemDraft =
  | Omit<AssemblyMaterialItem, "id" | "user_id" | "created_at" | "updated_at" | "assembly_id">
  | Omit<AssemblyLaborItem, "id" | "user_id" | "created_at" | "updated_at" | "assembly_id">
  | Omit<AssemblyEquipmentItem, "id" | "user_id" | "created_at" | "updated_at" | "assembly_id">
  | Omit<AssemblyAdditionalItem, "id" | "user_id" | "created_at" | "updated_at" | "assembly_id">;

