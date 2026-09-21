import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Heading } from "@/shared/components/ui/heading";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { FinancialSummary } from "@/shared/logic/financials";
import { sanitizeHtml } from "@/shared/lib/sanitizeText";
import { ClientProposalFinancialSummary } from "./ClientProposalFinancialSummary";

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
      <div
        ref={ref}
        data-report-root="true"
        className="bg-background p-6 sm:p-8 lg:p-10 print:p-0"
      >
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
            <Heading level={1}>{companyInfo.name}</Heading>
            <p className="text-sm text-muted-foreground">{companyInfo.website}</p>
            <p className="text-sm text-muted-foreground">{companyInfo.email}</p>
          </div>
          <div className="text-end">
            <h2 className="text-3xl font-extrabold text-primary mb-2">
              {t("project_reports:clientProposal")}
            </h2>
            <Badge className="mb-2">
              {t("project_reports:clientFacingLabel")}
            </Badge>
            <p className="text-lg font-semibold text-foreground">
              {project.name}
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
              {project.description}
            </p>
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Proposal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm text-foreground">
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
        </div>

        <Separator className="my-6 bg-border" />

        {/* Project Summary */}
        <h3 className="text-xl font-bold text-foreground mb-4">
          {t("project_reports:projectSummary")}
        </h3>
        <p className="text-sm text-foreground mb-8 whitespace-pre-line break-words">
          {project.client_requirements ||
            t("project_reports:noClientRequirements")}
        </p>

        <Separator className="my-6 bg-border" />

        {/* Proposed Cost */}
        <h3 className="text-xl font-bold text-foreground mb-4">
          {t("project_reports:proposedCost")}
        </h3>
        <ClientProposalFinancialSummary
          financials={financials}
          project={project}
          formatCurrency={formatCurrency}
          t={t}
        />

        <Separator className="my-6 bg-border" />

        {/* Terms and Conditions */}
        <h3 className="text-xl font-bold text-foreground mb-4">
          {t("project_reports:termsAndConditions")}
        </h3>
        <div
          className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(terms) }}
        />
      </div>
    );
  },
);

ClientProposalReport.displayName = "ClientProposalReport";
