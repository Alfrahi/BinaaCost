import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import {
  calculateProjectFinancials,
  FinancialSettings,
  DEFAULT_FINANCIAL_SETTINGS,
} from "@/shared/logic/financials";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface FinancialSummaryBarProps {
  costs: {
    materialsTotal: number;
    laborTotal: number;
    equipmentTotal: number;
    additionalTotal: number;
    riskContingency?: number;
  };
  currency?: string;
  settings?: FinancialSettings;
  onViewPricing: () => void;
}

export default function FinancialSummaryBar({
  costs,
  currency = "USD",
  settings,
  onViewPricing,
}: FinancialSummaryBarProps) {
  const { t } = useTranslation(["project_detail", "common"]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  const financials = calculateProjectFinancials(
    costs,
    settings ?? DEFAULT_FINANCIAL_SETTINGS,
  );

  const locationFactor = settings?.location_factor ?? 1;
  const hasLocationAdjustment = locationFactor !== 1;
  const locationLabel = settings?.location_label
    ? `${settings.location_label} ×${locationFactor}`
    : `×${locationFactor}`;

  const steps: { label: string; value: number; key: string }[] = [
    {
      key: "direct",
      label: hasLocationAdjustment
        ? t("project_detail:profit_pricing.baseDirectCosts")
        : t("project_detail:profit_pricing.totalDirectCosts"),
      value: hasLocationAdjustment
        ? financials.directCostsBase
        : financials.directCosts,
    },
    ...(hasLocationAdjustment
      ? [{
          key: "location",
          label: locationLabel,
          value: financials.locationAdjustmentAmount,
        }]
      : []),
    {
      key: "overhead",
      label: t("project_detail:profit_pricing.overhead"),
      value: financials.overheadAmount,
    },
    {
      key: "contingency",
      label:
        financials.contingencyBasis === "risk_register"
          ? t("project_detail:profit_pricing.riskRegisterContingency")
          : financials.contingencyBasis === "combined"
            ? t("project_detail:profit_pricing.combinedContingency")
            : t("project_detail:profit_pricing.generalContingency"),
      value: financials.contingencyAmount,
    },
    {
      key: "markup",
      label: t("project_detail:profit_pricing.markup"),
      value: financials.markupAmount,
    },
    {
      key: "tax",
      label: t("project_detail:profit_pricing.taxes"),
      value: financials.taxAmount,
    },
  ];

  const grandTotalLabel = t("project_detail:profit_pricing.finalProjectTotal");

  const breakdown = (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
      data-testid="financial-chain"
    >
      {steps.map((step, i) => (
        <span key={step.key} className="flex items-center gap-x-2">
          {i > 0 && <span className="text-muted-foreground">+</span>}
          <span className="text-muted-foreground">{step.label}</span>
          <span className="font-medium tabular-nums">
            {format(step.value, currency)}
          </span>
        </span>
      ))}
      <span className="text-muted-foreground">=</span>
    </div>
  );

  const grandTotal = (
    <button
      type="button"
      onClick={onViewPricing}
      className="flex items-baseline gap-2 shrink-0 rounded-sm p-1 -m-1 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-start cursor-pointer"
      aria-label={t("project_detail:profit_pricing.viewPricing")}
      title={t("project_detail:profit_pricing.viewPricing")}
    >
      <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        {grandTotalLabel}
      </span>
      <span className="text-lg font-bold tabular-nums text-foreground flex items-center gap-1.5">
        {format(financials.grandTotal, currency)}
        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
      </span>
    </button>
  );

  return (
    <div className="sticky top-0 z-20 -mt-4 sm:-mt-6 pt-4 sm:pt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-background/95 backdrop-blur-sm border-b border-border shadow-xs">
      <div className="flex items-center justify-between gap-4 py-2">
        {isMobile ? (
          <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
                aria-label={t(
                  expanded
                    ? "project_detail:profit_pricing.hideBreakdown"
                    : "project_detail:profit_pricing.showBreakdown",
                )}
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </Button>
              {grandTotal}
            </div>
          </div>
        ) : (
          <>
            {breakdown}
            {grandTotal}
          </>
        )}
      </div>
      {isMobile && expanded && (
        <div className="pb-2">
          {breakdown}
        </div>
      )}
    </div>
  );
}
