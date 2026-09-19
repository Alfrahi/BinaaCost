

import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Info } from "lucide-react";
import { FinancialSettings } from "@/shared/logic/financials";
import { cn } from "@/shared/lib/utils";

interface SummaryRowProps {
  label: string;
  value: string;
  className?: string;
  subLabel?: string;
  tooltip?: string;
  valueClassName?: string;
}

const SummaryRow = ({
  label,
  value,
  className = "",
  subLabel,
  tooltip,
  valueClassName = "",
}: SummaryRowProps) => (
  <div className={cn("flex justify-between items-center py-1", className)}>
    <div>
      <div className="flex items-center gap-1">
        <span className="font-medium text-foreground text-sm">{label}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="text-xs"><p>{tooltip}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {subLabel && <div className="text-xs text-muted-foreground">{subLabel}</div>}
    </div>
    <div className={cn("font-semibold text-sm", valueClassName)}>{value}</div>
  </div>
);

interface FinancialSummaryTableProps {
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
  currency: string;
  settings: FinancialSettings;
  financials: {
    directCosts: number;
    locationAdjustmentAmount: number;
    overheadAmount: number;
    contingencyAmount: number;
    primeCost: number;
    markupAmount: number;
    bidPrice: number;
    taxAmount: number;
    grandTotal: number;
  };
  riskContingency?: number;
  scenarioCount?: number;
  locationLabel?: string;
  onNavigateToRisks?: () => void;
  format: (value: number, currency: string, options?: { showSign?: boolean; compact?: boolean }) => string;
}

export function FinancialSummaryTable({
  materialsTotal,
  laborTotal,
  equipmentTotal,
  additionalTotal,
  currency,
  settings,
  financials,
  riskContingency,
  scenarioCount,
  locationLabel,
  onNavigateToRisks,
  format,
}: FinancialSummaryTableProps) {
  const { t } = useTranslation(["project_detail", "common", "project_tabs"]);

  return (
    <Card className="shadow-md border-accent">
      <CardHeader className="bg-accent py-4 border-b border-accent">
        <CardTitle className="text-xl text-accent-foreground m-0">{t("project_detail:profit_pricing.title")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-1">
          <div className="bg-muted p-3 rounded-lg mb-4 text-sm">
            <SummaryRow label={t("project_tabs:materials")} value={format(materialsTotal, currency)} className="text-muted-foreground" />
            <SummaryRow label={t("project_tabs:labor")} value={format(laborTotal, currency)} className="text-muted-foreground" />
            <SummaryRow label={t("project_tabs:equipment")} value={format(equipmentTotal, currency)} className="text-muted-foreground" />
            <SummaryRow label={t("project_tabs:additional")} value={format(additionalTotal, currency)} className="text-muted-foreground" />
            <div className="border-t border-border my-2"></div>
            <SummaryRow label={t("project_detail:profit_pricing.totalDirectCosts")} value={format(financials.directCosts, currency)} className="text-base font-bold text-foreground" />
          </div>

          {(settings.location_factor ?? 1) !== 1 && (
            <div className="px-2 pt-1">
              <SummaryRow
                label={locationLabel
                  ? `${t("project_detail:profit_pricing.locationFactor")} (${locationLabel} ×${settings.location_factor})`
                  : `${t("project_detail:profit_pricing.locationFactor")} (×${settings.location_factor})`}
                value={format(financials.locationAdjustmentAmount, currency, { showSign: true })}
                className={cn("text-sm font-medium", financials.locationAdjustmentAmount >= 0 ? "text-success" : "text-destructive")}
              />
            </div>
          )}

          <div className="px-2 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="w-8 text-center text-muted-foreground text-lg">+</div>
              <div className="flex-1">
                <SummaryRow
                  label={t("project_detail:profit_pricing.overheadWithPercent", { percent: settings.overhead_percent })}
                  value={format(financials.overheadAmount, currency)}
                  className="text-foreground"
                  valueClassName="text-destructive"
                  tooltip={t("project_detail:profit_pricing.tooltips.overhead")}
                />
                <SummaryRow
                  label={t("project_detail:profit_pricing.generalContingencyWithPercent", { percent: settings.contingency_percent })}
                  value={format(financials.contingencyAmount, currency)}
                  className="text-foreground"
                  valueClassName="text-destructive"
                  tooltip={t("project_detail:profit_pricing.tooltips.generalContingency")}
                />
              </div>
            </div>

            {riskContingency !== undefined && (
              <div className="ps-10">
                <SummaryRow
                  label={t("project_detail:profit_pricing.riskContingency")}
                  value={format(riskContingency, currency)}
                  className="text-muted-foreground"
                  tooltip={t("project_detail:profit_pricing.riskContingencyCombinedTooltip")}
                />
                <p className="text-xs text-muted-foreground -mt-1">{t("project_detail:profit_pricing.riskContingencyInfo")}</p>
              </div>
            )}

            {scenarioCount !== undefined && (
              <div className="ps-10">
                <SummaryRow label={t("project_detail:profit_pricing.scenarios")} value={String(scenarioCount)} className="text-muted-foreground" />
              </div>
            )}

            <div className="border-t border-dashed border-border my-2"></div>

            <SummaryRow
              label={t("project_detail:profit_pricing.primeCost")}
              subLabel={t("project_detail:profit_pricing.primeCostDesc")}
              value={format(financials.primeCost, currency)}
              className="text-lg font-semibold text-foreground"
              tooltip={t("project_detail:profit_pricing.tooltips.primeCost")}
            />

            <div className="flex items-center gap-4 text-sm mt-2">
              <div className="w-8 text-center text-muted-foreground text-lg">+</div>
              <div className="flex-1">
                <SummaryRow
                  label={t("project_detail:profit_pricing.markupWithPercent", { percent: settings.markup_percent })}
                  value={format(financials.markupAmount, currency)}
                  className="text-foreground font-medium"
                  valueClassName="text-success"
                  tooltip={t("project_detail:profit_pricing.tooltips.markup")}
                />
              </div>
            </div>

            <div className="border-t border-border my-2"></div>

            <SummaryRow
              label={t("project_detail:profit_pricing.subtotalBeforeTax")}
              value={format(financials.bidPrice, currency)}
              className="text-lg font-bold text-foreground"
              tooltip={t("project_detail:profit_pricing.tooltips.subtotal")}
            />

            <div className="flex items-center gap-4 text-sm mt-2">
              <div className="w-8 text-center text-muted-foreground text-lg">+</div>
              <div className="flex-1">
                <SummaryRow
                  label={t("project_detail:profit_pricing.taxesWithPercent", { percent: settings.tax_percent })}
                  value={format(financials.taxAmount, currency)}
                  className="text-foreground"
                  tooltip={t("project_detail:profit_pricing.tooltips.tax")}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 bg-success text-success-foreground p-4 rounded-lg shadow-lg transform scale-105">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">{t("project_detail:profit_pricing.finalProjectTotal")}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-4 h-4 text-success-foreground/80" /></TooltipTrigger>
                    <TooltipContent className="text-xs"><p>{t("project_detail:profit_pricing.tooltips.grandTotal")}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-2xl font-bold tabular-nums">{format(financials.grandTotal, currency)}</span>
            </div>
          </div>
        </div>
        {onNavigateToRisks && (
          <Button variant="link" size="sm" onClick={onNavigateToRisks} className="text-sm p-0 h-auto mt-4">
            {t("project_detail:profit_pricing.seeAlsoRisks")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}