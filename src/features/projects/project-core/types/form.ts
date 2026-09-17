import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(1, "project_form:nameRequired"),
  description: z.string().optional().nullable(),
  type: z.string().min(1, "project_form:typeRequired"),
  size: z.coerce
    .number()
    .min(0, "project_form:sizeNonNegative")
    .optional()
    .nullable(),
  size_unit: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  client_requirements: z.string().optional().nullable(),
  duration_days: z.coerce
    .number()
    .min(1, "project_form:durationPositive")
    .optional()
    .nullable(),
  duration_unit: z.string().optional().nullable(),
  currency: z.string().min(1, "project_form:currencyRequired"),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
