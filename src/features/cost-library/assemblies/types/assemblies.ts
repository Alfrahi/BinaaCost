export interface Assembly {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export type AssemblyMaterialDetails = Record<string, never>;
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

export interface AssemblyItem {
  id: string;
  assembly_id: string;
  user_id: string;
  item_type: "material" | "labor" | "equipment" | "additional";
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  details:
    | AssemblyMaterialDetails
    | AssemblyLaborDetails
    | AssemblyEquipmentDetails
    | AssemblyAdditionalCostDetails
    | null;
  created_at: string;
  updated_at: string;
}
