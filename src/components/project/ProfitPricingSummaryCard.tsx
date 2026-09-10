import { useState, useMemo, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { useTranslation } from "react-i18next";
import { Loader2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import {
  calculateProjectFinancials,
  FinancialSettings,
  DEFAULT_FINANCIAL_SETTINGS,
} from "@/logic/financials";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpdateProjectFinancialSettings } from "@/hooks/useUpdateProjectFinancialSettings";
import {
  FinancialAssumptionsStrip,
  DefaultAssumptionsWarning,
} from "./FinancialAssumptions";
import { cn } from "@/lib/utils";

const settingsSchema = z.object({
  overhead_percent: z.coerce
    .number()
    .min(0, "project_detail:profit_pricing.overheadError"),
  markup_percent: z.coerce
    .number()
    .min(0, "project_detail:profit_pricing.markupError"),
  tax_percent: z.coerce
    .number()
    .min(0, "project_detail:profit_pricing.taxError"),
  contingency_percent: z.coerce
    .number()
    .min(0, "project_detail:profit_pricing.generalContingencyError"),
});

interface Props {
  projectId: string;
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
  currency?: string;
  initialSettings?: FinancialSettings;
  riskContingency?: number;
  scenarioCount?: number;
  settingsConfirmed?: boolean;
  onNavigateToRisks?: () => void;
}

const SummaryRow = ({
  label,
  value,
  className = "",
  subLabel,
  tooltip,
  valueClassName = "",
}: {
  label: string;
  value: string;
  className?: string;
  subLabel?: string;
  tooltip?: string;
  valueClassName?: string;
}) => (
  <div className={cn("flex justify-between items-center py-1", className)}>
    <div>
      <div className="flex items-center gap-1">
        <span className="font-medium text-text-primary text-sm">{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-text-secondary" />
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {subLabel && (
        <div className="text-xs text-text-secondary">{subLabel}</div>
      )}
    </div>
    <div className={cn("font-semibold text-sm", valueClassName)}>{value}</div>
  </div>
);

export default function ProfitPricingSummaryCard({
  projectId,
  materialsTotal,
  laborTotal,
  equipmentTotal,
  additionalTotal,
  currency = "USD",
  initialSettings,
  riskContingency,
  scenarioCount,
  settingsConfirmed,
  onNavigateToRisks,
}: Props) {
  const { t } = useTranslation(["project_detail", "common", "project_tabs"]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();

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

  const handleChange = useCallback(
    (key: keyof FinancialSettings, value: string) => {
      const numValue = value === "" ? 0 : parseFloat(value);
      setSettings((prev) => ({ ...prev, [key]: numValue }));
      setIsDirty(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    const result = settingsSchema.safeParse(settings);
    if (!result.success) {
      return;
    }
    updateFinancialSettings.mutate({ projectId, newSettings: settings });
    setIsDirty(false);
  }, [settings, projectId, updateFinancialSettings]);

  const financials = useMemo(
    () =>
      calculateProjectFinancials(
        { materialsTotal, laborTotal, equipmentTotal, additionalTotal },
        settings,
      ),
    [materialsTotal, laborTotal, equipmentTotal, additionalTotal, settings],
  );

  return (
    <div className="space-y-4">
      {settingsConfirmed !== true && (
        <DefaultAssumptionsWarning
          project={{ financial_settings_confirmed: false }}
        />
      )}
      <FinancialAssumptionsStrip settings={settings} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
      <Card className="lg:col-span-1 shadow-sm border-border h-fit">
        <CardHeader className="bg-muted py-4 border-b">
          <CardTitle className="text-lg flex justify-between items-center m-0">
            {t("project_detail:profit_pricing.loadingsMarkups")}
            {isDirty && (
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
          <div>
            <Label htmlFor="overhead" className="text-sm text-text-secondary">
              {t("project_detail:profit_pricing.overhead")}
            </Label>
            <div className="relative mt-1">
              <Input
                id="overhead"
                type="number"
                min="0"
                value={settings.overhead_percent}
                onChange={(e) =>
                  handleChange("overhead_percent", e.target.value)
                }
                className="pe-8 text-sm"
              />
              <span className="absolute end-3 top-2.5 text-text-secondary text-sm">
                %
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {t("project_detail:profit_pricing.overheadDesc")}
            </p>
          </div>

          <div>
            <Label
              htmlFor="contingency"
              className="text-sm text-text-secondary"
            >
              {t("project_detail:profit_pricing.generalContingency")}
            </Label>
            <div className="relative mt-1">
              <Input
                id="contingency"
                type="number"
                min="0"
                value={settings.contingency_percent}
                onChange={(e) =>
                  handleChange("contingency_percent", e.target.value)
                }
                className="pe-8 text-sm"
              />
              <span className="absolute end-3 top-2.5 text-text-secondary text-sm">
                %
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {t("project_detail:profit_pricing.generalContingencyDesc")}
            </p>
          </div>

          <div>
            <Label htmlFor="markup" className="text-sm text-text-secondary">
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
              />
              <span className="absolute end-3 top-2.5 text-text-secondary text-sm">
                %
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {t("project_detail:profit_pricing.markupDesc")}
            </p>
          </div>

          <div>
            <Label htmlFor="taxes" className="text-sm text-text-secondary">
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
              />
              <span className="absolute end-3 top-2.5 text-text-secondary text-sm">
                %
              </span>
            </div>
          </div>

          {isDirty && (
            <Button
              className="w-full mt-4 text-sm"
              onClick={handleSave}
              disabled={updateFinancialSettings.isPending}
            >
              {updateFinancialSettings.isPending
                ? t("common:saving")
                : t("common:saveChanges")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 shadow-md border-accent">
        <CardHeader className="bg-accent py-4 border-b border-accent">
          <CardTitle className="text-xl text-accent-foreground m-0">
            {t("project_detail:profit_pricing.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-1">
            <div className="bg-muted p-3 rounded-lg mb-4 text-sm">
              <SummaryRow
                label={t("project_tabs:materials")}
                value={format(materialsTotal, currency)}
                className="text-text-secondary"
              />
              <SummaryRow
                label={t("project_tabs:labor")}
                value={format(laborTotal, currency)}
                className="text-text-secondary"
              />
              <SummaryRow
                label={t("project_tabs:equipment")}
                value={format(equipmentTotal, currency)}
                className="text-text-secondary"
              />
              <SummaryRow
                label={t("project_tabs:additional")}
                value={format(additionalTotal, currency)}
                className="text-text-secondary"
              />
              <div className="border-t border-border my-2"></div>
              <SummaryRow
                label={t("project_detail:profit_pricing.totalDirectCosts")}
                value={format(financials.directCosts, currency)}
                className="text-base font-bold text-text-primary"
              />
            </div>

            <div className="px-2 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="w-8 text-center text-text-secondary text-lg">
                  +
                </div>
                <div className="flex-1">
                  <SummaryRow
                    label={t(
                      "project_detail:profit_pricing.overheadWithPercent",
                      { percent: settings.overhead_percent },
                    )}
                    value={format(financials.overheadAmount, currency)}
                    className="text-text-primary"
                    valueClassName="text-red-600"
                    tooltip={t(
                      "project_detail:profit_pricing.tooltips.overhead",
                    )}
                  />
                  <SummaryRow
                    label={t(
                      "project_detail:profit_pricing.generalContingencyWithPercent",
                      { percent: settings.contingency_percent },
                    )}
                    value={format(financials.contingencyAmount, currency)}
                    className="text-text-primary"
                    valueClassName="text-red-600"
                    tooltip={t(
                      "project_detail:profit_pricing.tooltips.generalContingency",
                    )}
                  />
                </div>
              </div>

              {riskContingency !== undefined && (
                <div className="ps-10">
                  <SummaryRow
                    label={t(
                      "project_detail:profit_pricing.riskContingency",
                    )}
                    value={format(riskContingency, currency)}
                    className="text-text-secondary"
                    tooltip={t(
                      "project_detail:profit_pricing.riskContingencyCombinedTooltip",
                    )}
                  />
                  <p className="text-xs text-text-secondary -mt-1">
                    {t("project_detail:profit_pricing.riskContingencyInfo")}
                  </p>
                </div>
              )}

              {scenarioCount !== undefined && (
                <div className="ps-10">
                  <SummaryRow
                    label={t("project_detail:profit_pricing.scenarios")}
                    value={String(scenarioCount)}
                    className="text-text-secondary"
                  />
                </div>
              )}

              <div className="border-t border-dashed border-border my-2"></div>

              <SummaryRow
                label={t("project_detail:profit_pricing.primeCost")}
                subLabel={t("project_detail:profit_pricing.primeCostDesc")}
                value={format(financials.primeCost, currency)}
                className="text-lg font-semibold text-text-primary"
                tooltip={t("project_detail:profit_pricing.tooltips.primeCost")}
              />

              <div className="flex items-center gap-4 text-sm mt-2">
                <div className="w-8 text-center text-text-secondary text-lg">
                  +
                </div>
                <div className="flex-1">
                  <SummaryRow
                    label={t(
                      "project_detail:profit_pricing.markupWithPercent",
                      { percent: settings.markup_percent },
                    )}
                    value={format(financials.markupAmount, currency)}
                    className="text-text-primary font-medium"
                    valueClassName="text-green-600"
                    tooltip={t("project_detail:profit_pricing.tooltips.markup")}
                  />
                </div>
              </div>

              <div className="border-t border-border my-2"></div>

              <SummaryRow
                label={t("project_detail:profit_pricing.subtotalBeforeTax")}
                value={format(financials.bidPrice, currency)}
                className="text-lg font-bold text-text-primary"
                tooltip={t("project_detail:profit_pricing.tooltips.subtotal")}
              />

              <div className="flex items-center gap-4 text-sm mt-2">
                <div className="w-8 text-center text-text-secondary text-lg">
                  +
                </div>
                <div className="flex-1">
                  <SummaryRow
                    label={t("project_detail:profit_pricing.taxesWithPercent", {
                      percent: settings.tax_percent,
                    })}
                    value={format(financials.taxAmount, currency)}
                    className="text-text-primary"
                    tooltip={t("project_detail:profit_pricing.tooltips.tax")}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 bg-success text-success-foreground p-4 rounded-lg shadow-lg transform scale-105">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">
                    {t("project_detail:profit_pricing.finalProjectTotal")}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-success-foreground/80" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <p>
                          {t(
                            "project_detail:profit_pricing.tooltips.grandTotal",
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-2xl font-bold">
                  {format(financials.grandTotal, currency, {
                    notation: "compact",
                  })}
                </span>
              </div>
            </div>
          </div>
          {onNavigateToRisks && (
            <Button
              variant="link"
              size="sm"
              onClick={onNavigateToRisks}
              className="text-sm p-0 h-auto mt-4"
            >
              {t("project_detail:profit_pricing.seeAlsoRisks")}
            </Button>
          )}

          {isMobile && isDirty && (
            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-xl p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between max-w-lg mx-auto">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium">{t("project_detail:profit_pricing.finalProjectTotal")}</span>
                  <span className="text-sm text-muted-foreground">({t("project_detail:profit_pricing.editing")})</span>
                </div>
                <span className="text-2xl font-bold tabular-nums">
                  {format(financials.grandTotal, currency, { notation: "compact" })}
                </span>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
      </div>
    </div>
  );
}
