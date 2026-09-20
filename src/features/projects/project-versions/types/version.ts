import type { Project, ProjectGroup, Risk } from "@/features/projects/project-core/types/project";
import type {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";

import type { VersionCostSummary } from "@/shared/logic/versionCosts";
import type { FinancialSummary } from "@/shared/logic/financials";

export interface ProjectSnapshotData {
  project?: Partial<Project> | null;
  materials?: MaterialItem[];
  labor_items?: LaborItem[];
  equipment_items?: EquipmentItem[];
  additional_costs?: AdditionalCostItem[];
  risks?: Risk[];
  project_groups?: ProjectGroup[];
  summary?: VersionCostSummary;
  financials?: FinancialSummary;
  [key: string]: unknown;
}

export interface ProjectVersion {
  id: string;
  name: string;
  created_at: string;
  is_final: boolean;
  created_by_user_id?: string;
  author_name?: string;
  data?: ProjectSnapshotData;
}
