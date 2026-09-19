import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { Heading } from "@/shared/components/ui/heading";
import { Badge } from "@/shared/components/ui/badge";

interface ReportHeaderProps {
  companyInfo: {
    name: string;
    website: string;
    logoUrl: string;
    email: string;
  };
  project: any;
  preparedBy: string;
  versionStamp?: { name: string; date: string };
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  companyInfo,
  project,
  preparedBy,
  versionStamp,
}) => {
  const { t } = useTranslation([
    "project_reports",
    "project_detail",
    "common",
    "project_versions",
    "durations",
  ]);
  const { formatDate } = useDateFormatter();

  return (
    <>
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
            {t("project_reports:projectCostReport")}
          </h2>
          <Badge variant="muted" className="mb-2">
            {t("project_reports:internalLabel")}
          </Badge>
          <p className="text-lg font-semibold text-foreground">
            {project.name}
          </p>
          <p className="text-sm text-muted-foreground">{project.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm text-foreground">
        <div>
          <p>
            <strong>{t("project_detail:overview.type")}:</strong>{" "}
            {project.type}
          </p>
          <p>
            <strong>{t("project_detail:overview.location")}:</strong>{" "}
            {project.location || t("common:notSpecified")}
          </p>
          <p>
            <strong>{t("project_detail:overview.size")}:</strong>{" "}
            {project.size} {project.size_unit}
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
    </>
  );
};
