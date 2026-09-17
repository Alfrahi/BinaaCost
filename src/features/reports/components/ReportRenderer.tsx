"use client";

import { useTranslation } from "react-i18next";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { Separator } from "@/shared/components/ui/separator";
import { Heading } from "@/shared/components/ui/heading";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { FinancialSummary } from "@/shared/logic/financials";
import { Badge } from "@/shared/components/ui/badge";

interface ReportRendererProps {
  project: any;
  financials: FinancialSummary;
  companyInfo: {
    name: string;
    website: string;
    logoUrl: string;
    email: string;
  };
  preparedBy: string;
  versionStamp?: { name: string; date: string };
  titleKey: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "muted";
  badgeLabelKey?: string;
  clientName?: string;
  projectDetails?: JSX.Element;
  customSections?: JSX.Element;
  financialSummarySection?: JSX.Element;
  showFinancialAssumptions?: boolean;
}

interface FinancialSummaryRow {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
  isBold?: boolean;
  isPrimary?: boolean;
  isSubtotal?: boolean;
  isSeparator?: boolean;
}

export function ReportRenderer({
  project,
  financials,
  companyInfo,
  preparedBy,
  versionStamp,
  titleKey,
  badgeVariant = "muted",
  badgeLabelKey,
  
  projectDetails,
  customSections,
  financialSummarySection,
  showFinancialAssumptions = true,
}: ReportRendererProps) {
  const { t } = useTranslation(["project_reports", "project_detail", "common", "project_versions", "durations"]);
  const { format: formatCurrency } = useCurrencyFormatter();
  const { formatDate } = useDateFormatter();

  const financialRows: FinancialSummaryRow[] = [
    {
      label: t("project_detail:profit_pricing.totalDirectCosts"),
      value: formatCurrency(financials.directCosts, project.currency),
      isSubtotal: true,
    },
    {
      label: t("project_detail:profit_pricing.overheadWithPercent", { percent: project.financial_settings.overhead_percent }),
      value: formatCurrency(financials.overheadAmount, project.currency),
    },
    {
      label: t("project_detail:profit_pricing.generalContingencyWithPercent", { percent: project.financial_settings.contingency_percent }),
      value: formatCurrency(financials.contingencyAmount, project.currency),
    },
    {
      label: t("project_detail:profit_pricing.primeCost"),
      value: formatCurrency(financials.primeCost, project.currency),
      isBold: true,
    },
    {
      label: t("project_detail:profit_pricing.markupWithPercent", { percent: project.financial_settings.markup_percent }),
      value: formatCurrency(financials.markupAmount, project.currency),
    },
    {
      label: t("project_detail:profit_pricing.subtotalBeforeTax"),
      value: formatCurrency(financials.bidPrice, project.currency),
      isBold: true,
    },
    {
      label: t("project_detail:profit_pricing.taxesWithPercent", { percent: project.financial_settings.tax_percent }),
      value: formatCurrency(financials.taxAmount, project.currency),
    },
    {
      label: t("project_detail:profit_pricing.finalProjectTotal"),
      value: formatCurrency(financials.grandTotal, project.currency),
      isPrimary: true,
    },
  ];

  return (
    <div className="bg-background p-6 sm:p-8 lg:p-10 print:p-0">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {companyInfo.logoUrl && (
            <img src={companyInfo.logoUrl} alt="Company Logo" className="h-12 mb-2" />
          )}
          <Heading level={1}>{companyInfo.name}</Heading>
          <p className="text-sm text-muted-foreground">{companyInfo.website}</p>
          <p className="text-sm text-muted-foreground">{companyInfo.email}</p>
        </div>
        <div className="text-end">
          <h2 className="text-3xl font-extrabold text-primary mb-2">{t(titleKey)}</h2>
          {badgeLabelKey && <Badge variant={badgeVariant} className="mb-2">{t(badgeLabelKey)}</Badge>}
          <p className="text-lg font-semibold text-foreground">{project.name}</p>
          <p className="text-sm text-muted-foreground">{project.description}</p>
        </div>
      </div>

      <Separator className="my-6 bg-border" />

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm text-foreground">
        <div>{projectDetails}</div>
        <div>
          <p><strong>{t("project_detail:overview.duration")}:</strong> {project.duration_days} {t(`durations:${project.duration_unit.toLowerCase()}`)}</p>
          <p><strong>{t("project_detail:overview.currency")}:</strong> {project.currency}</p>
          <p><strong>{t("project_reports:preparedBy")}:</strong> {preparedBy}</p>
          {versionStamp && (
            <p><strong>{t("project_versions:versionStamp", { name: versionStamp.name, date: versionStamp.date })}</strong></p>
          )}
          <p><strong>{t("project_reports:date")}:</strong> {formatDate(new Date(), "long")}</p>
        </div>
      </div>

      <Separator className="my-6 bg-border" />

      {customSections}

      {/* Financial Summary */}
      <h3 className="text-xl font-bold text-foreground mb-4">{t("project_reports:financialSummary")}</h3>
      {showFinancialAssumptions && (
        <div className="mb-3 text-sm text-muted-foreground">
          <span className="font-semibold">{t("project_detail:profit_pricing.assumptions")}: </span>
          {t("project_detail:profit_pricing.overhead")} {project.financial_settings.overhead_percent}% ·{" "}
          {t("project_detail:profit_pricing.generalContingency")} {project.financial_settings.contingency_percent}% ·{" "}
          {t("project_detail:profit_pricing.markup")} {project.financial_settings.markup_percent}% ·{" "}
          {t("project_detail:profit_pricing.taxes")} {project.financial_settings.tax_percent}%
          {!project.financial_settings_confirmed && (
            <span className="block text-xs text-muted-foreground mt-1">
              {t("project_detail:profit_pricing.defaultAssumptionsWarning")}
            </span>
          )}
        </div>
      )}

      {financialSummarySection || (
        <div className="overflow-x-auto">
          <table className="w-full text-sm mb-8">
            <tbody>
              {financialRows.map((row, index) => (
                <tr
                  key={index}
                  className={[
                    row.isSubtotal && "bg-muted",
                    row.isPrimary && "bg-primary text-primary-foreground",
                    row.isSeparator && "border-t border-border",
                    index > 0 && "border-t border-border",
                  ].filter(Boolean).join(" ")}
                >
                  <td
                    className={[
                      row.isSubtotal && "font-semibold uppercase",
                      row.isBold && "font-semibold",
                      row.isPrimary && "text-lg font-bold uppercase",
                      "text-foreground",
                    ].filter(Boolean).join(" ")}
                  >
                    {row.label}
                  </td>
                  <td
                    className={[
                      "text-end",
                      row.isBold && "font-bold",
                      row.isPrimary && "text-lg font-bold",
                      "text-foreground",
                    ].filter(Boolean).join(" ")}
                  >
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}