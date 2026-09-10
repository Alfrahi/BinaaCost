import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "@/hooks/useDateFormatter";
import { Separator } from "@/components/ui/separator";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { FinancialSummary } from "@/logic/financials";
import { sanitizeHtml } from "@/utils/sanitizeText";

interface ClientProposalReportProps {
  project: any;
  financials: FinancialSummary;
  companyInfo: {
    name: string;
    website: string;
    logoUrl: string;
    email: string;
  };
  terms: string;
  preparedBy: string;
  clientName: string;
  versionStamp?: { name: string; date: string };
}

export const ClientProposalReport = React.forwardRef<
  HTMLDivElement,
  ClientProposalReportProps
>(
  (
    { project, financials, companyInfo, terms, preparedBy, clientName, versionStamp },
    ref,
  ) => {
    const { t } = useTranslation([
      "project_reports",
      "project_detail",
      "common",
      "project_versions",
      "durations",
    ]);
    const { format: formatCurrency } = useCurrencyFormatter();
    const { formatDate } = useDateFormatter();

    return (
      <div ref={ref} className="bg-background p-6 sm:p-8 lg:p-10 print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {companyInfo.logoUrl && (
              <img
                src={companyInfo.logoUrl}
                alt="Company Logo"
                className="h-12 mb-2"
              />
            )}
            <h1 className="text-2xl font-bold text-text-primary">
              {companyInfo.name}
            </h1>
            <p className="text-sm text-text-secondary">{companyInfo.website}</p>
            <p className="text-sm text-text-secondary">{companyInfo.email}</p>
          </div>
          <div className="text-end">
            <h2 className="text-3xl font-extrabold text-primary mb-2">
              {t("project_reports:clientProposal")}
            </h2>
            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mb-2">
              {t("project_reports:clientFacingLabel")}
            </span>
            <p className="text-lg font-semibold text-text-primary">
              {project.name}
            </p>
            <p className="text-sm text-text-secondary">{project.description}</p>
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Proposal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm text-text-primary">
          <div>
            <p>
              <strong>{t("project_reports:client")}:</strong>{" "}
              {clientName || t("common:notSpecified")}
            </p>
            <p>
              <strong>{t("project_detail:overview.type")}:</strong>{" "}
              {project.type}
            </p>
            <p>
              <strong>{t("project_detail:overview.location")}:</strong>{" "}
              {project.location || t("common:notSpecified")}
            </p>
          </div>
          <div>
            <p>
              <strong>{t("project_detail:overview.duration")}:</strong>{" "}
              {project.duration_days}{" "}
              {t(`durations:${project.duration_unit.toLowerCase()}`)}
            </p>
            <p>
              <strong>{t("project_detail:overview.currency")}:</strong>{" "}
              {project.currency}
            </p>
            <p>
              <strong>{t("project_reports:preparedBy")}:</strong> {preparedBy}
            </p>
            {versionStamp && (
              <p>
                <strong>{t("project_versions:versionStamp", {
                  name: versionStamp.name,
                  date: versionStamp.date,
                })}</strong>
              </p>
            )}
            <p>
              <strong>{t("project_reports:date")}:</strong>{" "}
              {formatDate(new Date(), "long")}
            </p>
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Project Summary */}
        <h3 className="text-xl font-bold text-text-primary mb-4">
          {t("project_reports:projectSummary")}
        </h3>
        <p className="text-sm text-text-primary mb-8">
          {project.client_requirements ||
            t("project_reports:noClientRequirements")}
        </p>

        <Separator className="my-6 bg-border" />

        {/* Proposed Cost */}
        <h3 className="text-xl font-bold text-text-primary mb-4">
          {t("project_reports:proposedCost")}
        </h3>
        <div className="mb-3 text-sm text-text-secondary">
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
            <span className="block text-xs text-text-secondary mt-1">
              {t(
                "project_detail:profit_pricing.defaultAssumptionsWarning",
              )}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mb-8">
            <tbody>
              <tr className="bg-muted">
                <td className="font-semibold uppercase text-text-primary">
                  {t("project_detail:profit_pricing.totalDirectCosts")}
                </td>
                <td className="text-end font-bold text-text-primary">
                  {formatCurrency(financials.directCosts, project.currency)}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="text-text-primary">
                  {t("project_detail:profit_pricing.overheadWithPercent", {
                    percent: project.financial_settings.overhead_percent,
                  })}
                </td>
                <td className="text-end text-text-primary">
                  {formatCurrency(financials.overheadAmount, project.currency)}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="text-text-primary">
                  {t("project_detail:profit_pricing.generalContingencyWithPercent", {
                    percent: project.financial_settings.contingency_percent,
                  })}
                </td>
                <td className="text-end text-text-primary">
                  {formatCurrency(
                    financials.contingencyAmount,
                    project.currency,
                  )}
                </td>
              </tr>
              <tr className="bg-muted border-t border-border">
                <td className="font-semibold uppercase text-text-primary">
                  {t("project_detail:profit_pricing.primeCost")}
                </td>
                <td className="text-end font-bold text-text-primary">
                  {formatCurrency(financials.primeCost, project.currency)}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="text-text-primary">
                  {t("project_detail:profit_pricing.markupWithPercent", {
                    percent: project.financial_settings.markup_percent,
                  })}
                </td>
                <td className="text-end text-text-primary">
                  {formatCurrency(financials.markupAmount, project.currency)}
                </td>
              </tr>
              <tr className="bg-muted border-t border-border">
                <td className="font-semibold uppercase text-text-primary">
                  {t("project_detail:profit_pricing.subtotalBeforeTax")}
                </td>
                <td className="text-end font-bold text-text-primary">
                  {formatCurrency(financials.bidPrice, project.currency)}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="text-text-primary">
                  {t("project_detail:profit_pricing.taxesWithPercent", {
                    percent: project.financial_settings.tax_percent,
                  })}
                </td>
                <td className="text-end text-text-primary">
                  {formatCurrency(financials.taxAmount, project.currency)}
                </td>
              </tr>
              <tr className="bg-primary text-primary-foreground">
                <td className="text-lg font-bold uppercase">
                  {t("project_detail:profit_pricing.finalProjectTotal")}
                </td>
                <td className="text-end text-lg font-bold">
                  {formatCurrency(financials.grandTotal, project.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Terms and Conditions */}
        <h3 className="text-xl font-bold text-text-primary mb-4">
          {t("project_reports:termsAndConditions")}
        </h3>
        <div
          className="text-sm text-text-primary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(terms) }}
        />
      </div>
    );
  },
);

ClientProposalReport.displayName = "ClientProposalReport";
