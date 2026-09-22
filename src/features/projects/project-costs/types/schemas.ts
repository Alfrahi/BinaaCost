import { z } from "zod";

export const materialSchema = z.object({
  name: z.string().min(1, "project_materials:nameRequired"),
  description: z.string().optional(),
  quantity: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "project_materials:quantityMin"),
  ),
  unit: z.string().min(1, "project_materials:unitRequired"),
  unit_price: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? undefined : Math.round(parsed * 100);
    },
    z.number().int().min(1, "project_materials:priceNonNegative"),
  ),
  group_id: z.string().optional(),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;

export const laborSchema = z.object({
  worker_type: z.string().min(1, "project_labor:workerTypeRequired"),
  description: z.string().optional().nullable(),
  number_of_workers: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().int().min(1, "project_labor:numWorkersMin"),
  ),
  daily_rate: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? undefined : Math.round(parsed * 100);
    },
    z.number().int().min(1, "project_labor:dailyRateNonNegative"),
  ),
  total_days: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "project_labor:totalDaysMin"),
  ),
  group_id: z.string().optional(),
});

export type LaborFormValues = z.infer<typeof laborSchema>;

export const equipmentSchema = z.object({
  name: z.string().min(1, "project_equipment:nameRequired"),
  type: z.string().optional(),
  rental_or_purchase: z.string().min(1, "project_equipment:rentalPurchaseRequired"),
  quantity: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().int().min(1, "project_equipment:quantityMin"),
  ),
  cost_per_period: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? undefined : Math.round(parsed * 100);
    },
    z.number().int().min(1, "project_equipment:costNonNegative"),
  ),
  period_unit: z.string().optional().default("Day"),
  usage_duration: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number().min(0.01, "project_equipment:usageDurationMin").optional().default(1),
  ),
  maintenance_cost: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? undefined : Math.round(parsed * 100);
    },
    z.number().int().min(0).optional().default(0),
  ),
  fuel_cost: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? undefined : Math.round(parsed * 100);
    },
    z.number().int().min(0).optional().default(0),
  ),
  group_id: z.string().optional(),
}).superRefine((data, ctx) => {
  const isPurchase = data.rental_or_purchase?.toLowerCase() === "purchase";
  if (!isPurchase) {
    if (!data.period_unit || data.period_unit.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period_unit"],
        message: "project_equipment:periodUnitRequired",
      });
    }
    if (data.usage_duration === undefined || data.usage_duration <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usage_duration"],
        message: "project_equipment:usageDurationMin",
      });
    }
  }
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>;

export const additionalCostSchema = z.object({
  category: z.string().min(1, "project_additional:categoryRequired"),
  description: z.string().optional(),
  amount: z.preprocess(
    (val) => {
      if (val === "" || val === undefined) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? undefined : Math.round(parsed * 100);
    },
    z.number().int().min(1, "project_additional:amountNonNegative"),
  ),
  group_id: z.string().optional(),
});

export type AdditionalCostFormValues = z.infer<typeof additionalCostSchema>;
