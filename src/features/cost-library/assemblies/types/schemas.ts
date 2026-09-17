import { z } from "zod";

export const assemblyMaterialSchema = z.object({
  description: z.string().trim().min(1, "project_materials:nameRequired"),
  quantity: z.coerce.number().min(0, "project_materials:quantityNonNegative"),
  unit: z.string().min(1, "project_materials:unitRequired"),
  unit_price: z.coerce.number().min(0, "project_materials:priceNonNegative"),
});
export type AssemblyMaterialFormValues = z.infer<typeof assemblyMaterialSchema>;

export const assemblyLaborSchema = z.object({
  description: z.string().trim().min(1, "project_labor:workerTypeRequired"),
  quantity: z.coerce.number().min(1, "project_labor:numWorkersMin"),
  unit_price: z.coerce.number().min(0, "project_labor:dailyRateNonNegative"),
  total_days: z.coerce.number().min(1, "project_labor:totalDaysMin"),
});
export type AssemblyLaborFormValues = z.infer<typeof assemblyLaborSchema>;

export const assemblyEquipmentSchema = z.object({
  description: z.string().trim().min(1, "project_equipment:nameRequired"),
  type: z.string().trim().optional().nullable(),
  rental_or_purchase: z
    .string()
    .min(1, "project_equipment:rentalPurchaseRequired"),
  quantity: z.coerce.number().min(1, "project_equipment:quantityMin"),
  unit_price: z.coerce.number().min(0, "project_equipment:costNonNegative"),
  unit: z.string().min(1, "project_equipment:periodUnitRequired"),
  usage_duration: z.coerce
    .number()
    .min(1, "project_equipment:usageDurationMin"),
  maintenance_cost: z.coerce.number().optional().nullable(),
  fuel_cost: z.coerce.number().optional().nullable(),
});
export type AssemblyEquipmentFormValues = z.infer<
  typeof assemblyEquipmentSchema
>;

export const assemblyAdditionalCostSchema = z.object({
  category: z.string().min(1, "project_additional:categoryRequired"),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().min(0, "project_additional:amountNonNegative"),
});
export type AssemblyAdditionalCostFormValues = z.infer<
  typeof assemblyAdditionalCostSchema
>;
