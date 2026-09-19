

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label } from "@/shared/components/ui/label";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useCostItemsCsvImporter } from "@/features/cost-library/hooks/useCostItemsCsvImporter";

export default function CostItemsCsvImportDialog({
  open,
  onOpenChange,
  databaseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  databaseId: string;
}) {
  const { t } = useTranslation(["pages", "common", "project_costs"]);

  const {
    loading,
    strategy,
    setStrategy,
    step,
    setStep,
    csvHeaders,
    fieldMapping,
    setFieldMapping,
    handleFileChange,
    handleFullParseAndImport,
    dialogTitle,
    SCHEMA_FIELDS,
  } = useCostItemsCsvImporter(databaseId, open, onOpenChange);

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
              <p className="text-sm text-foreground">
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

              <div className="space-y-3 pt-4">
                <Label className="text-sm font-medium">
                  {t("pages:data_import.duplicateHandling")}
                </Label>
                <RadioGroup
                  value={strategy}
                  onValueChange={(v) => setStrategy(v as "skip" | "overwrite")}
                  className="flex flex-col space-y-1"
                  disabled={loading}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label
                      htmlFor="skip"
                      className="font-normal cursor-pointer text-sm"
                    >
                      {t("pages:data_import.skipDuplicates")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="overwrite" id="overwrite" />
                    <Label
                      htmlFor="overwrite"
                      className="font-normal cursor-pointer text-sm"
                    >
                      {t("pages:data_import.overwriteExisting")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
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
