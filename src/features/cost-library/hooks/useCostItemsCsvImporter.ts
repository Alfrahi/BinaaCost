

import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCostDatabaseItems } from "@/features/cost-library/hooks/useCostDatabaseItems";
import {
  COST_ITEM_SCHEMA_FIELDS,
  parseAndValidateCostItemsCsv,
} from "@/features/cost-library/utils/csv";
import { handleError } from "@/shared/lib/toast";

const SCHEMA_FIELDS = COST_ITEM_SCHEMA_FIELDS;

type CsvRow = Record<string, string>;

export function useCostItemsCsvImporter(
  databaseId: string,
  open: boolean,
  onOpenChange: (v: boolean) => void,
) {
  const { t } = useTranslation(["pages", "common", "project_costs"]);
  const { importItems } = useCostDatabaseItems(databaseId);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<"skip" | "overwrite">("skip");
  const [step, setStep] = useState<"upload" | "map">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<
    Record<string, string | null>
  >(() => Object.fromEntries(SCHEMA_FIELDS.map((field) => [field.key, null])));

  useEffect(() => {
    if (!open) {
      setFile(null);
      setLoading(false);
      setStep("upload");
      setCsvHeaders([]);
      setFieldMapping(
        Object.fromEntries(SCHEMA_FIELDS.map((field) => [field.key, null])),
      );
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      setLoading(true);
      Papa.parse<CsvRow>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 1,
        complete: (result) => {
          const headers = result.meta.fields || [];
          setCsvHeaders(headers);
          const initialMapping: Record<string, string | null> = {};
          SCHEMA_FIELDS.forEach((schemaField) => {
            const matchingHeader = headers.find(
              (h) =>
                h.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                schemaField.key.toLowerCase().replace(/[^a-z0-9]/g, ""),
            );
            initialMapping[schemaField.key] = matchingHeader || null;
          });
          setFieldMapping(initialMapping);
          setStep("map");
          setLoading(false);
        },
        error: (err) => {
          handleError(err);
          setLoading(false);
          setStep("upload");
        },
      });
    }
  };

  const handleFullParseAndImport = async () => {
    if (!file) return;

    const unmappedFields = SCHEMA_FIELDS.filter(
      (field) => !fieldMapping[field.key],
    );
    if (unmappedFields.length > 0) {
      toast.error(
        t("pages:data_import.missingMapping", {
          fields: unmappedFields.map((f) => t(f.labelKey)).join(", "),
        }),
      );
      return;
    }

    setLoading(true);

    try {
      const { parsedData: mappedAndValidatedRows, invalidRows } =
        await parseAndValidateCostItemsCsv(file, fieldMapping);

      if (invalidRows.length > 0) {
        toast.error(
          t("pages:data_import.validationErrors", {
            count: invalidRows.length,
            details: invalidRows
              .map((ir) => `Row ${ir.row}: ${ir.errors.join(", ")}`)
              .join("; "),
          }),
          { duration: 10000 },
        );
        setLoading(false);
        return;
      }

      if (mappedAndValidatedRows.length === 0) {
        toast.error(t("pages:data_import.warning_no_data"));
        setLoading(false);
        return;
      }

      await importItems.mutateAsync({
        items: mappedAndValidatedRows,
        strategy,
      });

      toast.success(
        t("pages:data_import.success_import", {
          count: mappedAndValidatedRows.length,
        }),
      );
      onOpenChange(false);
    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle = useMemo(() => {
    if (step === "upload") return t("pages:data_import.importCsv");
    if (step === "map") return t("pages:data_import.mapCsvColumns");
    return t("pages:data_import.importCsv");
  }, [step, t]);

  return {
    file,
    setFile,
    loading,
    setLoading,
    strategy,
    setStrategy,
    step,
    setStep,
    csvHeaders,
    setCsvHeaders,
    fieldMapping,
    setFieldMapping,
    handleFileChange,
    handleFullParseAndImport,
    dialogTitle,
    SCHEMA_FIELDS,
  };
}
