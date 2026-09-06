import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import {
  calculateProjectFinancials,
  FinancialSettings,
  DEFAULT_FINANCIAL_SETTINGS,
} from "@/logic/financials";
import { useIsMobile } from "@/hooks/useMobile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FinancialSummaryBarProps {
  costs: {
    materialsTotal: number;
    laborTotal: number;
    equipmentTotal: number;
    additionalTotal: number;
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

  const steps: { label: string; value: number; key: string }[] = [
    {
      key: "direct",
      label: t("project_detail:profit_pricing.totalDirectCosts"),
      value: financials.directCosts,
    },
    {
      key: "overhead",
      label: t("project_detail:profit_pricing.overhead"),
      value: financials.overheadAmount,
    },
    {
      key: "contingency",
      label: t("project_detail:profit_pricing.contingency"),
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
          {i > 0 && <span className="text-text-secondary">+</span>}
          <span className="text-text-secondary">{step.label}</span>
          <span className="font-medium tabular-nums">
            {format(step.value, currency)}
          </span>
        </span>
      ))}
      <span className="text-text-secondary">=</span>
    </div>
  );

  const grandTotal = (
    <span className="flex items-baseline gap-2">
      <span className="text-sm font-medium">{grandTotalLabel}</span>
      <span className="text-lg font-bold tabular-nums text-text-primary">
        {format(financials.grandTotal, currency)}
      </span>
    </span>
  );

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border">
      <div className="flex items-center justify-between gap-4 py-2">
        {isMobile ? (
          <div className="flex flex-1 items-center gap-2 min-w-0">
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
        ) : (
          <>
            {breakdown}
            {grandTotal}
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewPricing}
          className="text-sm shrink-0"
        >
          <TrendingUp className="w-4 h-4 me-1" />
          {t("project_detail:profit_pricing.viewPricing")}
        </Button>
      </div>
      {isMobile && expanded && (
        <div className="pb-2">
          {breakdown}
        </div>
      )}
    </div>
  );
}
