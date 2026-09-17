import Papa from "papaparse";
import { z } from "zod";
import i18n from "@/i18n";
import { handleError } from "@/shared/lib/toast";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import {
  materialSchema,
  laborSchema,
  equipmentSchema,
  additionalCostSchema,
} from "@/features/projects/project-costs/types/schemas";

export type ProjectItemType =
  | "materials"
  | "labor"
  | "equipment"
  | "additional";

export interface ProjectCsvField {
  key: string;
  labelKey: string;
  type?: "text" | "number";
  required?: boolean;
}

export interface ProjectCsvConfig {
  type: ProjectItemType;
  fields: ProjectCsvField[];
  schema: z.ZodType;
  /** Build full form values from a mapped CSV row (string values). */
  buildValues: (row: Record<string, string>) => Record<string, unknown>;
}

type CsvRow = Record<string, string>;

export interface ProjectCsvParseResult {
  parsedData: Record<string, unknown>[];
  invalidRows: { row: number; errors: string[] }[];
}

export const PROJECT_CSV_CONFIGS: Record<ProjectItemType, ProjectCsvConfig> = {
  materials: {
    type: "materials",
    schema: materialSchema,
    fields: [
      { key: "name", labelKey: "project_materials:columns.name", required: true },
      {
        key: "quantity",
        labelKey: "project_materials:columns.quantity",
        type: "number",
        required: true,
      },
      { key: "unit", labelKey: "project_materials:columns.unit", required: true },
      {
        key: "unit_price",
        labelKey: "project_materials:columns.unitPrice",
        type: "number",
        required: true,
      },
      { key: "description", labelKey: "project_materials:columns.description" },
    ],
    buildValues: (row) => ({
      name: sanitizeText(row.name),
      description: row.description ? sanitizeText(row.description) : undefined,
      quantity: Number(row.quantity),
      unit: sanitizeText(row.unit),
      unit_price: Number(row.unit_price),
      group_id: "ungrouped",
    }),
  },
  labor: {
    type: "labor",
    schema: laborSchema,
    fields: [
      {
        key: "worker_type",
        labelKey: "project_labor:columns.workerType",
        required: true,
      },
      {
        key: "number_of_workers",
        labelKey: "project_labor:columns.numWorkers",
        type: "number",
        required: true,
      },
      {
        key: "daily_rate",
        labelKey: "project_labor:columns.dailyRate",
        type: "number",
        required: true,
      },
      {
        key: "total_days",
        labelKey: "project_labor:columns.totalDays",
        type: "number",
        required: true,
      },
      { key: "description", labelKey: "project_labor:columns.description" },
    ],
    buildValues: (row) => ({
      worker_type: sanitizeText(row.worker_type),
      description: row.description ? sanitizeText(row.description) : undefined,
      number_of_workers: Number(row.number_of_workers),
      daily_rate: Number(row.daily_rate),
      total_days: Number(row.total_days),
      group_id: "ungrouped",
    }),
  },
  equipment: {
    type: "equipment",
    schema: equipmentSchema,
    fields: [
      { key: "name", labelKey: "project_equipment:columns.name", required: true },
      { key: "type", labelKey: "project_equipment:columns.type" },
      {
        key: "rental_or_purchase",
        labelKey: "project_equipment:columns.rentalPurchase",
        required: true,
      },
      {
        key: "quantity",
        labelKey: "project_equipment:columns.quantity",
        type: "number",
        required: true,
      },
      {
        key: "cost_per_period",
        labelKey: "project_equipment:columns.costPerPeriod",
        type: "number",
        required: true,
      },
      {
        key: "period_unit",
        labelKey: "project_equipment:columns.periodUnit",
        required: true,
      },
      {
        key: "usage_duration",
        labelKey: "project_equipment:columns.usageDuration",
        type: "number",
        required: true,
      },
      {
        key: "maintenance_cost",
        labelKey: "project_equipment:columns.maintenance",
        type: "number",
      },
      {
        key: "fuel_cost",
        labelKey: "project_equipment:columns.fuel",
        type: "number",
      },
    ],
    buildValues: (row) => ({
      name: sanitizeText(row.name),
      type: row.type ? sanitizeText(row.type) : undefined,
      rental_or_purchase: sanitizeText(row.rental_or_purchase),
      quantity: Number(row.quantity),
      cost_per_period: Number(row.cost_per_period),
      period_unit: sanitizeText(row.period_unit),
      usage_duration: Number(row.usage_duration),
      maintenance_cost: row.maintenance_cost ? Number(row.maintenance_cost) : 0,
      fuel_cost: row.fuel_cost ? Number(row.fuel_cost) : 0,
      group_id: "ungrouped",
    }),
  },
  additional: {
    type: "additional",
    schema: additionalCostSchema,
    fields: [
      {
        key: "category",
        labelKey: "project_additional:columns.category",
        required: true,
      },
      {
        key: "description",
        labelKey: "project_additional:columns.description",
      },
      {
        key: "amount",
        labelKey: "project_additional:columns.amount",
        type: "number",
        required: true,
      },
    ],
    buildValues: (row) => ({
      category: sanitizeText(row.category),
      description: row.description ? sanitizeText(row.description) : undefined,
      amount: Number(row.amount),
      group_id: "ungrouped",
    }),
  },
};

export async function parseAndValidateProjectCsv(
  file: File,
  fieldMapping: Record<string, string | null>,
  config: ProjectCsvConfig,
): Promise<ProjectCsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsedData: Record<string, unknown>[] = [];
        const invalidRows: { row: number; errors: string[] }[] = [];

        result.data.forEach((row, index) => {
          const mappedRow: Record<string, string> = {};
          config.fields.forEach((field) => {
            const csvColumn = fieldMapping[field.key];
            mappedRow[field.key] =
              csvColumn && row[csvColumn] !== undefined
                ? (row[csvColumn]?.trim() ?? "")
                : "";
          });

          const values = config.buildValues(mappedRow);
          const parsed = config.schema.safeParse(values);

          if (parsed.success) {
            parsedData.push(parsed.data as Record<string, unknown>);
          } else {
            const errors = parsed.error.issues.map((issue) => {
              const field = config.fields.find(
                (f) => f.key === issue.path[0],
              );
              return field
                ? `${i18n.t(field.labelKey)}: ${i18n.t(issue.message)}`
                : i18n.t(issue.message);
            });
            invalidRows.push({ row: index + 2, errors });
          }
        });

        resolve({ parsedData, invalidRows });
      },
      error: (err) => {
        handleError(err);
        reject(err);
      },
    });
  });
}