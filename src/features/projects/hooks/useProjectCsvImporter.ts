import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  PROJECT_CSV_CONFIGS,
  parseAndValidateProjectCsv,
  ProjectItemType,
} from "@/shared/lib/projectCsv";
import { handleError } from "@/shared/lib/toast";

type CsvRow = Record<string, string>;

export function useProjectCsvImporter(
  itemType: ProjectItemType,
  open: boolean,
  onOpenChange: (v: boolean) => void,
  onImport: (values: Record<string, unknown>) => Promise<void>,
) {
  const { t } = useTranslation(["pages", "common"]);
  const config = PROJECT_CSV_CONFIGS[itemType];

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "map">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<
    Record<string, string | null>
  >(() => Object.fromEntries(config.fields.map((f) => [f.key, null])));

  useEffect(() => {
    if (!open) {
      setFile(null);
      setLoading(false);
      setStep("upload");
      setCsvHeaders([]);
      setFieldMapping(
        Object.fromEntries(config.fields.map((f) => [f.key, null])),
      );
    }
  }, [open, config]);

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
          config.fields.forEach((schemaField) => {
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

    const unmappedFields = config.fields.filter(
      (field) => field.required && !fieldMapping[field.key],
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
      const { parsedData, invalidRows } = await parseAndValidateProjectCsv(
        file,
        fieldMapping,
        config,
      );

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

      if (parsedData.length === 0) {
        toast.error(t("pages:data_import.warning_no_data"));
        setLoading(false);
        return;
      }

      for (const values of parsedData) {
        await onImport(values);
      }

      toast.success(
        t("pages:data_import.success_import", {
          count: parsedData.length,
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
    loading,
    step,
    setStep,
    csvHeaders,
    fieldMapping,
    setFieldMapping,
    handleFileChange,
    handleFullParseAndImport,
    dialogTitle,
    SCHEMA_FIELDS: config.fields,
  };
}