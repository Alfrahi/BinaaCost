interface BaseItem {
  id: string;
  user_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export type MaterialItem = BaseItem & {
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  supplier_options?: any;
  group_id?: string | null;
};

export type LaborItem = BaseItem & {
  worker_type: string;
  description?: string | null;
  number_of_workers: number;
  daily_rate: number;
  total_days: number;
  total_cost?: number | null;
  group_id?: string | null;
};

export type EquipmentItem = BaseItem & {
  name: string;
  type?: string | null;
  rental_or_purchase: string;
  quantity: number;
  cost_per_period: number;
  period_unit: string;
  usage_duration: number;
  maintenance_cost?: number | null;
  fuel_cost?: number | null;
  total_cost?: number | null;
  group_id?: string | null;
};

export type AdditionalCostItem = BaseItem & {
  category: string;
  description?: string | null;
  amount: number;
  group_id?: string | null;
};
