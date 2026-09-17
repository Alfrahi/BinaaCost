"use client";

import { useMemo } from "react";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { useTranslation } from "react-i18next";
import {
  calculateProjectFinancials,
  FinancialSettings,
  DEFAULT_FINANCIAL_SETTINGS,
} from "@/shared/logic/financials";
import { FinancialInputs } from "./FinancialInputs";
import { FinancialSummaryTable } from "./FinancialSummaryTable";
import { MobileBar } from "./ProfitPricingMobileBar";

interface ProfitPricingSummaryCardProps {
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
}: ProfitPricingSummaryCardProps) {
  const { t } = useTranslation(["project_detail", "common", "project_tabs"]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();

  const settings = initialSettings || DEFAULT_FINANCIAL_SETTINGS;

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
        <FinancialInputs
          projectId={projectId}
          initialSettings={initialSettings}
          settingsConfirmed={settingsConfirmed}
        />

        <FinancialSummaryTable
          materialsTotal={materialsTotal}
          laborTotal={laborTotal}
          equipmentTotal={equipmentTotal}
          additionalTotal={additionalTotal}
          currency={currency}
          settings={settings}
          financials={{
            directCosts: financials.directCosts,
            locationAdjustmentAmount: financials.locationAdjustmentAmount,
            overheadAmount: financials.overheadAmount,
            contingencyAmount: financials.contingencyAmount,
            primeCost: financials.primeCost,
            markupAmount: financials.markupAmount,
            bidPrice: financials.bidPrice,
            taxAmount: financials.taxAmount,
            grandTotal: financials.grandTotal,
          }}
          riskContingency={riskContingency}
          scenarioCount={scenarioCount}
          locationLabel={settings.location_label}
          onNavigateToRisks={onNavigateToRisks}
          format={format}
        />
      </div>
      <MobileBar
        isMobile={isMobile}
        isDirty={false} // isDirty is now managed inside FinancialInputs
        currency={currency}
        grandTotal={financials.grandTotal}
        format={format}
        t={t}
      />
    </div>
  );
}