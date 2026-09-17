import Papa from "papaparse";
import i18n from "@/i18n";
import { handleError } from "@/shared/lib/toast";
import { sanitizeText } from "@/shared/lib/sanitizeText";

export const COST_ITEM_SCHEMA_FIELDS = [
  { key: "csi_division", labelKey: "project_costs:csiDivision" },
  { key: "csi_code", labelKey: "project_costs:csiCode" },
  { key: "description", labelKey: "common:description" },
  { key: "unit", labelKey: "common:unit" },
  { key: "unit_price", labelKey: "common:price" },
];

export interface CostItemImportData {
  csi_division: string;
  csi_code: string;
  description: string;
  unit: string;
  unit_price: number;
}

type CsvRow = Record<string, string>;

interface ParseAndValidateCsvResult {
  parsedData: CostItemImportData[];
  invalidRows: { row: number; errors: string[] }[];
}

// Formula-injection defense for CSV EXPORT only: prefix cells whose value
// starts with =,+,-,@ so spreadsheet apps treat them as text, not formulas.
// Import must store the raw value (no prefix) — see parseAndValidateCostItemsCsv.
export function escapeCsvCell(value: unknown): string {
  const s = String(value ?? "");
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

export async function parseAndValidateCostItemsCsv(
  file: File,
  fieldMapping: Record<string, string | null>,
): Promise<ParseAndValidateCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rawData = result.data;

        const mappedAndValidatedRows: CostItemImportData[] = [];
        const invalidRows: { row: number; errors: string[] }[] = [];

        rawData.forEach((row, index) => {
          const errors: string[] = [];
          const mappedRow: Partial<CostItemImportData> = {};

          COST_ITEM_SCHEMA_FIELDS.forEach((schemaField) => {
            const csvColumn = fieldMapping[schemaField.key];
            if (csvColumn && row[csvColumn] !== undefined) {
              const value: any = row[csvColumn]?.trim();

              if (schemaField.key === "unit_price") {
                const parsedPrice = Number(value);
                if (isNaN(parsedPrice)) {
                  errors.push(
                    i18n.t("pages:data_import.invalidPrice", { value }),
                  );
                } else {
                  (mappedRow as any)[schemaField.key] = parsedPrice;
                }
              } else {
                (mappedRow as any)[schemaField.key] = sanitizeText(value);
              }
            } else if (schemaField.key !== "description") {
              errors.push(
                i18n.t("pages:data_import.missingValue", {
                  field: i18n.t(schemaField.labelKey),
                }),
              );
            }
          });

          if (!mappedRow.csi_division)
            errors.push(i18n.t("project_costs:csiDivisionRequired"));
          if (!mappedRow.csi_code)
            errors.push(i18n.t("project_costs:csiCodeRequired"));
          if (!mappedRow.description)
            errors.push(i18n.t("common:descriptionRequired"));
          if (!mappedRow.unit)
            errors.push(i18n.t("common:unitRequired"));
          if (mappedRow.unit_price === undefined || mappedRow.unit_price < 0)
            errors.push(i18n.t("common:priceNonNegative"));

          if (errors.length > 0) {
            invalidRows.push({ row: index + 2, errors });
          } else {
            mappedAndValidatedRows.push(mappedRow as CostItemImportData);
          }
        });
        resolve({ parsedData: mappedAndValidatedRows, invalidRows });
      },
      error: (err) => {
        handleError(err);
        reject(err);
      },
    });
  });
}
