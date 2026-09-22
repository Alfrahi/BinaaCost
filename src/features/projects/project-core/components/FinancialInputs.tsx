

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { useUpdateProjectFinancialSettings } from "@/features/projects/project-core/hooks/useUpdateProjectFinancialSettings";
import {
  FinancialAssumptionsStrip,
  DefaultAssumptionsWarning,
} from "../../project-reports/components/FinancialAssumptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { FinancialSettings, DEFAULT_FINANCIAL_SETTINGS } from "@/shared/logic/financials";

const settingsSchema = z.object({
  overhead_percent: z.coerce.number().min(0, "project_detail:profit_pricing.overheadError"),
  markup_percent: z.coerce.number().min(0, "project_detail:profit_pricing.markupError"),
  tax_percent: z.coerce.number().min(0, "project_detail:profit_pricing.taxError"),
  contingency_percent: z.coerce.number().min(0, "project_detail:profit_pricing.generalContingencyError"),
  contingency_basis: z.enum(["flat", "risk_register", "combined"]).optional(),
  location_factor: z.coerce.number().min(0.01, "project_detail:profit_pricing.locationFactorError").optional(),
});

interface FinancialInputsProps {
  projectId: string;
  initialSettings?: FinancialSettings;
  settingsConfirmed?: boolean;
  projectVersion?: number;
  canEdit?: boolean;
}

export function FinancialInputs({
  projectId,
  initialSettings,
  settingsConfirmed,
  projectVersion,
  canEdit = true,
}: FinancialInputsProps) {
  const { t } = useTranslation(["project_detail", "common"]);

  const [settings, setSettings] = useState<FinancialSettings>(
    initialSettings || DEFAULT_FINANCIAL_SETTINGS,
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setIsDirty(false);
    }
  }, [initialSettings]);

  const updateFinancialSettings = useUpdateProjectFinancialSettings();

  const handleChange = useCallback((field: keyof FinancialSettings, value: string) => {
    const numValue = parseFloat(value);
    setSettings((prev) => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue,
    }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    const result = settingsSchema.safeParse(settings);
    if (!result.success) return;
    updateFinancialSettings.mutate({ projectId, newSettings: settings, version: projectVersion });
    setIsDirty(false);
  }, [settings, projectId, projectVersion, updateFinancialSettings]);

  return (
    <div className="space-y-4">
      {settingsConfirmed !== true && (
        <DefaultAssumptionsWarning project={{ financial_settings_confirmed: false }} />
      )}
      <FinancialAssumptionsStrip settings={settings} />
      <Card className="shadow-sm border-border h-fit">
        <CardHeader className="bg-muted py-4 border-b">
          <CardTitle className="flex justify-between items-center m-0">
            {t("project_detail:profit_pricing.loadingsMarkups")}
            {isDirty && canEdit && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateFinancialSettings.isPending}
                className="h-8 text-sm"
              >
                {updateFinancialSettings.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {!canEdit && (
            <div className="bg-muted/70 border border-border rounded-md px-3 py-2 text-xs text-muted-foreground">
              {t("project_detail:profit_pricing.readOnlyNotice")}
            </div>
          )}
          <div>
            <Label htmlFor="overhead" className="text-sm text-muted-foreground">
              {t("project_detail:profit_pricing.overhead")}
            </Label>
            <div className="relative mt-1">
              <Input
                id="overhead"
                type="number"
                min="0"
                value={settings.overhead_percent}
                onChange={(e) => handleChange("overhead_percent", e.target.value)}
                className="pe-8 text-sm"
                disabled={!canEdit}
              />
              <span className="absolute end-3 top-2.5 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("project_detail:profit_pricing.overheadDesc")}</p>
          </div>

          <div>
            <Label htmlFor="contingency-basis" className="text-sm text-muted-foreground">
              {t("project_detail:profit_pricing.contingencyBasis")}
            </Label>
            <div className="mt-1">
              <Select
                value={settings.contingency_basis || "flat"}
                onValueChange={(val: "flat" | "risk_register" | "combined") => {
                  setSettings((prev) => ({ ...prev, contingency_basis: val }));
                  setIsDirty(true);
                }}
                disabled={!canEdit}
              >
                <SelectTrigger id="contingency-basis" className="text-sm" disabled={!canEdit}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">
                    {t("project_detail:profit_pricing.contingencyBasisFlat")}
                  </SelectItem>
                  <SelectItem value="risk_register">
                    {t("project_detail:profit_pricing.contingencyBasisRiskRegister")}
                  </SelectItem>
                  <SelectItem value="combined">
                    {t("project_detail:profit_pricing.contingencyBasisCombined")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {settings.contingency_basis === "risk_register"
                ? t("project_detail:profit_pricing.contingencyBasisRiskRegisterDesc")
                : settings.contingency_basis === "combined"
                  ? t("project_detail:profit_pricing.contingencyBasisCombinedDesc")
                  : t("project_detail:profit_pricing.contingencyBasisFlatDesc")}
            </p>
          </div>

          <div>
            <Label htmlFor="contingency" className="text-sm text-muted-foreground">
              {t("project_detail:profit_pricing.generalContingency")}
            </Label>
            <div className="relative mt-1">
              <Input
                id="contingency"
                type="number"
                min="0"
                value={settings.contingency_percent}
                onChange={(e) => handleChange("contingency_percent", e.target.value)}
                className="pe-8 text-sm"
                disabled={!canEdit || settings.contingency_basis === "risk_register"}
              />
              <span className="absolute end-3 top-2.5 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {settings.contingency_basis === "risk_register"
                ? t("project_detail:profit_pricing.generalContingencyIgnored")
                : t("project_detail:profit_pricing.generalContingencyDesc")}
            </p>
          </div>

          <div>
            <Label htmlFor="markup" className="text-sm text-muted-foreground">
              {t("project_detail:profit_pricing.markup")}
            </Label>
            <div className="relative mt-1">
              <Input
                id="markup"
                type="number"
                min="0"
                value={settings.markup_percent}
                onChange={(e) => handleChange("markup_percent", e.target.value)}
                className="pe-8 text-sm"
                disabled={!canEdit}
              />
              <span className="absolute end-3 top-2.5 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("project_detail:profit_pricing.markupDesc")}</p>
          </div>

          <div>
            <Label htmlFor="taxes" className="text-sm text-muted-foreground">
              {t("project_detail:profit_pricing.taxes")}
            </Label>
            <div className="relative mt-1">
              <Input
                id="taxes"
                type="number"
                min="0"
                value={settings.tax_percent}
                onChange={(e) => handleChange("tax_percent", e.target.value)}
                className="pe-8 text-sm"
                disabled={!canEdit}
              />
              <span className="absolute end-3 top-2.5 text-muted-foreground text-sm">%</span>
            </div>
          </div>

          <div>
            <Label htmlFor="location-factor" className="text-sm text-muted-foreground">
              {t("project_detail:profit_pricing.locationFactor")}
            </Label>
            <div className="relative mt-1">
              <Input
                id="location-factor"
                type="number"
                min="0.01"
                step="0.01"
                value={settings.location_factor ?? 1}
                onChange={(e) => handleChange("location_factor", e.target.value)}
                className="pe-8 text-sm"
                disabled={!canEdit}
              />
              <span className="absolute end-3 top-2.5 text-muted-foreground text-sm">×</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("project_detail:profit_pricing.locationFactorDesc")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("project_detail:profit_pricing.locationFactorTooltip")}</p>
          </div>

          {isDirty && canEdit && (
            <Button
              className="w-full mt-4 text-sm"
              onClick={handleSave}
              disabled={updateFinancialSettings.isPending}
            >
              {updateFinancialSettings.isPending ? t("common:saving") : t("common:saveChanges")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}