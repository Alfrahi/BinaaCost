import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useProjectCsvImporter } from "@/features/projects/hooks/useProjectCsvImporter";
import { ProjectItemType } from "@/shared/lib/projectCsv";

export default function ProjectCsvImportDialog({
  open,
  onOpenChange,
  itemType,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemType: ProjectItemType;
  onImport: (values: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useTranslation(["pages", "common"]);

  const {
    loading,
    step,
    setStep,
    csvHeaders,
    fieldMapping,
    setFieldMapping,
    handleFileChange,
    handleFullParseAndImport,
    dialogTitle,
    SCHEMA_FIELDS,
  } = useProjectCsvImporter(itemType, open, onOpenChange, onImport);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === "upload" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("pages:data_import.selectCsvFile")}
              </Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="text-sm"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                {t("pages:data_import.requiredColumnsInfo")}
              </p>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("pages:data_import.mapInstructions")}
              </p>
              {SCHEMA_FIELDS.map((schemaField) => (
                <div
                  key={schemaField.key}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 items-center gap-4"
                >
                  <Label
                    htmlFor={`map-${schemaField.key}`}
                    className="col-span-full sm:col-span-1 text-sm font-medium"
                  >
                    {t(schemaField.labelKey)}
                  </Label>
                  <Select
                    value={fieldMapping[schemaField.key] || ""}
                    onValueChange={(value) =>
                      setFieldMapping((prev) => ({
                        ...prev,
                        [schemaField.key]: value,
                      }))
                    }
                    disabled={loading}
                  >
                    <SelectTrigger
                      id={`map-${schemaField.key}`}
                      className="col-span-full sm:col-span-2 text-sm"
                    >
                      <SelectValue
                        placeholder={t("pages:data_import.selectCsvColumn")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header) => (
                        <SelectItem
                          key={header}
                          value={header}
                          className="text-sm"
                        >
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-sm"
              disabled={loading}
            >
              {t("common:cancel")}
            </Button>
          )}
          {step === "map" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="text-sm"
                disabled={loading}
              >
                {t("common:back")}
              </Button>
              <Button
                onClick={handleFullParseAndImport}
                disabled={
                  loading ||
                  Object.values(fieldMapping).some((val) => val === null)
                }
                className="text-sm"
              >
                {loading ? t("common:importing") : t("common:import")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}