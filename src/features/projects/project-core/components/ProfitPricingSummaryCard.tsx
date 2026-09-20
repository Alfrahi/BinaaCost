

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
import { useProjectRisks } from "@/features/projects/project-costs/hooks/useProjectRisks";
import { calculateCategoryTotal } from "@/shared/logic/shared";

interface ProfitPricingSummaryCardProps {
  projectId: string;
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
  currency?: string;
  initialSettings?: FinancialSettings;
  scenarioCount?: number;
  settingsConfirmed?: boolean;
  canEditFinancials?: boolean;
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
  scenarioCount,
  settingsConfirmed,
  canEditFinancials = true,
  onNavigateToRisks,
}: ProfitPricingSummaryCardProps) {
  const { t } = useTranslation(["project_detail", "common", "project_tabs"]);
  const { format } = useCurrencyFormatter();
  const isMobile = useIsMobile();

  const { data: risks = [] } = useProjectRisks(projectId);
  const riskContingency = useMemo(() => calculateCategoryTotal.risks(risks), [risks]);

  const settings = initialSettings || DEFAULT_FINANCIAL_SETTINGS;

  const financials = useMemo(
    () =>
      calculateProjectFinancials(
        {
          materialsTotal,
          laborTotal,
          equipmentTotal,
          additionalTotal,
          riskContingency,
        },
        settings,
      ),
    [
      materialsTotal,
      laborTotal,
      equipmentTotal,
      additionalTotal,
      riskContingency,
      settings,
    ],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
        <FinancialInputs
          projectId={projectId}
          initialSettings={initialSettings}
          settingsConfirmed={settingsConfirmed}
          canEdit={canEditFinancials}
        />

        <FinancialSummaryTable
          materialsTotal={materialsTotal}
          laborTotal={laborTotal}
          equipmentTotal={equipmentTotal}
          additionalTotal={additionalTotal}
          currency={currency}
          settings={settings}
          financials={{
            directCostsBase: financials.directCostsBase,
            directCosts: financials.directCosts,
            locationAdjustmentAmount: financials.locationAdjustmentAmount,
            overheadAmount: financials.overheadAmount,
            contingencyAmount: financials.contingencyAmount,
            contingencyBasis: financials.contingencyBasis,
            flatContingencyAmount: financials.flatContingencyAmount,
            riskContingencyAmount: financials.riskContingencyAmount,
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