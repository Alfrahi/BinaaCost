export interface ProjectCostData {
  id: string;
  name: string;
  currency: string;
  materials_cost: number;
  labor_cost: number;
  equipment_cost: number;
  additional_cost: number;
  total_cost: number;
}

export interface AnalyticsTotals {
  materials: number;
  labor: number;
  equipment: number;
  additional: number;
}

export interface AnalyticsData {
  projects: ProjectCostData[];
  totals: AnalyticsTotals;
  grandTotal: number;
  displayCurrency: string;
  missingRates: string[];
  /** Names of projects whose currency cannot be converted to displayCurrency. */
  affectedProjects: string[];
}
