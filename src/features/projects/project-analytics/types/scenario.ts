import { z } from "zod";

const scenarioRuleSchema = z.object({
  item_type: z.enum([
    "materials",
    "labor",
    "equipment",
    "additional",
    "risks",
    "financial_settings",
  ]),
  field: z.string().min(1, "scenario_analysis:fieldRequired"),
  adjustment_type: z.enum(["percentage_increase", "fixed_increase", "by_id"]),
  value: z.coerce
    .number()
    .or(z.string())
    .refine((val) => val !== null, {
      message: "scenario_analysis:valueRequired",
    }),
  filter_name_contains: z.string().optional().nullable(),
  filter_category_is: z.string().optional().nullable(),
  filter_worker_type_contains: z.string().optional().nullable(),
});

export type ScenarioRuleFormValues = z.infer<typeof scenarioRuleSchema>;

export const scenarioFormSchema = z.object({
  name: z.string().min(1, "scenario_analysis:nameRequired"),
  description: z.string().optional().nullable(),
  is_public: z.boolean().default(false),
  impact_rules: z
    .array(scenarioRuleSchema)
    .min(1, "scenario_analysis:atLeastOneRule"),
});

export type ScenarioFormValues = z.infer<typeof scenarioFormSchema>;

export interface Scenario {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  impact_rules: ScenarioRule[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SimulationResult {
  original: {
    financials: {
      materialsTotal: number;
      laborTotal: number;
      equipmentTotal: number;
      additionalTotal: number;
      overheadAmount: number;
      contingencyAmount: number;
      primeCost: number;
      markupAmount: number;
      bidPrice: number;
      taxAmount: number;
      grandTotal: number;
    };
  };
  simulated: {
    financials: {
      materialsTotal: number;
      laborTotal: number;
      equipmentTotal: number;
      additionalTotal: number;
      overheadAmount: number;
      contingencyAmount: number;
      primeCost: number;
      markupAmount: number;
      bidPrice: number;
      taxAmount: number;
      grandTotal: number;
    };
  };
}

export interface ScenarioRule {
  item_type:
    | "materials"
    | "labor"
    | "equipment"
    | "additional"
    | "risks"
    | "financial_settings";
  field: string;
  adjustment_type: "percentage_increase" | "fixed_increase" | "by_id";
  value: number | string;
  filter_name_contains?: string | null;
  filter_category_is?: string | null;
  filter_worker_type_contains?: string | null;
}
