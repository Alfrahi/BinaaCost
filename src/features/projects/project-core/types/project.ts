export interface ProjectFinancialSettings {
  tax_percent: number;
  markup_percent: number;
  overhead_percent: number;
  contingency_percent: number;
  contingency_basis?: "flat" | "risk_register" | "combined";
  location_factor?: number;
  location_label?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  size: string | null;
  location: string | null;
  client_requirements: string | null;
  duration_days: number | null;
  created_at: string;
  updated_at: string;
  size_unit: string | null;
  duration_unit: string | null;
  currency: string;
  user_id: string;
  deleted_at: string | null;
  financial_settings: ProjectFinancialSettings;
  financial_settings_confirmed?: boolean;
}

export interface ProjectGroup {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: string;
  project_id: string;
  description: string;
  probability: string;
  impact_amount: number;
  mitigation_plan: string | null;
  contingency_amount: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

import type {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "../../project-costs/types/items";
import type { FinancialSummary } from "@/shared/logic/financials";

export interface PublicProject extends Omit<Project, "financial_settings" | "user_id"> {
  user_id?: string;
  financial_settings?: ProjectFinancialSettings;
}

export interface PublicShareResponse {
  project: PublicProject;
  materials: MaterialItem[];
  labor: LaborItem[];
  equipment: EquipmentItem[];
  additional: AdditionalCostItem[];
  risks: Risk[];
  groups: ProjectGroup[];
  financials?: FinancialSummary;
  expires_at: string | null;
  password_protected?: boolean;
  error?: string;
}
