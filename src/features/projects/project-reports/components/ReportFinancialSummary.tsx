import React from "react";
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
} from "@/shared/components/ui/table";
import { FinancialSummary } from "@/shared/logic/financials";

interface ReportFinancialSummaryProps {
  financials: FinancialSummary;
  project: any;
  formatCurrency: (value: number, currency: string) => string;
  t: any;
}

export const ReportFinancialSummary: React.FC<ReportFinancialSummaryProps> = ({
  financials,
  project,
  formatCurrency,
  t,
}) => {
  return (
    <>
      {project?.financial_settings && (
        <div className="mb-3 text-sm text-muted-foreground">
          <span className="font-semibold">
            {t("project_detail:profit_pricing.assumptions")}:{" "}
          </span>
          {t("project_detail:profit_pricing.overhead")}{" "}
          {project.financial_settings.overhead_percent}% ·{" "}
          {t("project_detail:profit_pricing.generalContingency")}{" "}
          {project.financial_settings.contingency_percent}% ·{" "}
          {t("project_detail:profit_pricing.markup")}{" "}
          {project.financial_settings.markup_percent}% ·{" "}
          {t("project_detail:profit_pricing.taxes")}{" "}
          {project.financial_settings.tax_percent}%
          {!project.financial_settings_confirmed && (
            <span className="block text-xs text-muted-foreground mt-1">
              {t("project_detail:profit_pricing.defaultAssumptionsWarning")}
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <Table className="w-full text-sm mb-8">
          <TableBody>
            <TableRow className="bg-muted">
              <TableCell className="font-semibold uppercase text-foreground px-3 py-2 text-xs">
                {t("project_detail:profit_pricing.totalDirectCosts")}
              </TableCell>
              <TableCell className="text-end font-bold tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                {formatCurrency(financials.directCosts, project.currency)}
              </TableCell>
            </TableRow>
            {project?.financial_settings?.overhead_percent !== undefined && (
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground px-3 py-2 text-xs">
                  {t("project_detail:profit_pricing.overheadWithPercent", {
                    percent: project.financial_settings.overhead_percent,
                  })}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                  {formatCurrency(financials.overheadAmount, project.currency)}
                </TableCell>
              </TableRow>
            )}
            {project?.financial_settings?.contingency_percent !== undefined && (
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground px-3 py-2 text-xs">
                  {t("project_detail:profit_pricing.generalContingencyWithPercent", {
                    percent: project.financial_settings.contingency_percent,
                  })}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                  {formatCurrency(
                    financials.contingencyAmount,
                    project.currency,
                  )}
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted border-t border-border">
              <TableCell className="font-semibold uppercase text-foreground px-3 py-2 text-xs">
                {t("project_detail:profit_pricing.primeCost")}
              </TableCell>
              <TableCell className="text-end font-bold tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                {formatCurrency(financials.primeCost, project.currency)}
              </TableCell>
            </TableRow>
            {project?.financial_settings?.markup_percent !== undefined && (
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground px-3 py-2 text-xs">
                  {t("project_detail:profit_pricing.markupWithPercent", {
                    percent: project.financial_settings.markup_percent,
                  })}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                  {formatCurrency(financials.markupAmount, project.currency)}
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-muted border-t border-border">
              <TableCell className="font-semibold uppercase text-foreground px-3 py-2 text-xs">
                {t("project_detail:profit_pricing.subtotalBeforeTax")}
              </TableCell>
              <TableCell className="text-end font-bold tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                {formatCurrency(financials.bidPrice, project.currency)}
              </TableCell>
            </TableRow>
            {project?.financial_settings?.tax_percent !== undefined && (
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground px-3 py-2 text-xs">
                  {t("project_detail:profit_pricing.taxesWithPercent", {
                    percent: project.financial_settings.tax_percent,
                  })}
                </TableCell>
                <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                  {formatCurrency(financials.taxAmount, project.currency)}
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-primary text-primary-foreground">
              <TableCell className="text-base font-bold uppercase px-3 py-2.5">
                {t("project_detail:profit_pricing.finalProjectTotal")}
              </TableCell>
              <TableCell className="text-end text-base font-bold tabular-nums whitespace-nowrap px-3 py-2.5">
                {formatCurrency(financials.grandTotal, project.currency)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </>
  );
};
