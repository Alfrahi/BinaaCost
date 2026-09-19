import React from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/shared/components/ui/table";
import { Separator } from "@/shared/components/ui/separator";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { FinancialSummary } from "@/shared/logic/financials";
import { calculateCategoryTotal } from "@/shared/logic/shared";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";
import { Risk, ProjectGroup } from "@/features/projects/project-core/types/project";

import { ReportHeader } from "./ReportHeader";
import { GroupedCostTable } from "./GroupedCostTable";
import { ReportFinancialSummary } from "./ReportFinancialSummary";

interface ProjectCostReportProps {
  project: any;
  financials: FinancialSummary;
  materials: MaterialItem[];
  labor: LaborItem[];
  equipment: EquipmentItem[];
  additional: AdditionalCostItem[];
  risks: Risk[];
  groups: ProjectGroup[];
  companyInfo: {
    name: string;
    website: string;
    logoUrl: string;
    email: string;
  };
  preparedBy: string;
  versionStamp?: { name: string; date: string };
  allSettingsOptions: {
    material_unit: { value: string; label: string }[];
    equipment_period_unit: { value: string; label: string }[];
    additional_cost_category: { value: string; label: string }[];
    risk_probability: { value: string; label: string }[];
  };
}

export const ProjectCostReport = React.forwardRef<
  HTMLDivElement,
  ProjectCostReportProps
>(
  (
    {
      project,
      financials,
      materials,
      labor,
      equipment,
      additional,
      risks,
      groups,
      companyInfo,
      preparedBy,
      versionStamp,
      allSettingsOptions,
    },
    ref,
  ) => {
    const { t } = useTranslation([
      "project_reports",
      "project_detail",
      "common",
      "project_materials",
      "project_labor",
      "project_equipment",
      "project_additional",
      "project_risk",
      "project_versions",
      "durations",
    ]);
    const { format: formatCurrency } = useCurrencyFormatter();

    const getOptionLabel = React.useCallback((category: string, value: string) => {
      const options =
        allSettingsOptions[category as keyof typeof allSettingsOptions];
      return options?.find((opt) => opt.value === value)?.label || value;
    }, [allSettingsOptions]);

    return (
      <div ref={ref} className="bg-background p-6 sm:p-8 lg:p-10 print:p-0">
        <ReportHeader
          companyInfo={companyInfo}
          project={project}
          preparedBy={preparedBy}
          versionStamp={versionStamp}
        />

        <Separator className="my-6 bg-border" />

        <h3 className="text-xl font-bold text-foreground mb-4">
          {t("project_reports:costBreakdown")}
        </h3>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:materials")}
          </h4>
          <GroupedCostTable
            items={materials}
            itemType="materials"
            columns={[
              { key: "name", label: t("project_materials:columns.name") },
              {
                key: "description",
                label: t("project_materials:columns.description"),
              },
              { key: "quantity", label: t("project_materials:columns.quantity") },
              { key: "unit", label: t("project_materials:columns.unit") },
              {
                key: "unit_price",
                label: t("project_materials:columns.unitPrice"),
                isCurrency: true,
              },
            ]}
            groups={groups}
            currency={project.currency}
            formatCurrency={formatCurrency}
            getOptionLabel={getOptionLabel}
            t={t}
          />
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:labor")}
          </h4>
          <GroupedCostTable
            items={labor}
            itemType="labor"
            columns={[
              {
                key: "worker_type",
                label: t("project_labor:columns.workerType"),
              },
              {
                key: "number_of_workers",
                label: t("project_labor:columns.numWorkers"),
              },
              {
                key: "daily_rate",
                label: t("project_labor:columns.dailyRate"),
                isCurrency: true,
              },
              { key: "total_days", label: t("project_labor:columns.totalDays") },
            ]}
            groups={groups}
            currency={project.currency}
            formatCurrency={formatCurrency}
            getOptionLabel={getOptionLabel}
            t={t}
          />
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:equipment")}
          </h4>
          <GroupedCostTable
            items={equipment}
            itemType="equipment"
            columns={[
              { key: "name", label: t("project_equipment:columns.name") },
              { key: "type", label: t("project_equipment:columns.type") },
              {
                key: "rental_or_purchase",
                label: t("project_equipment:columns.rentalPurchase"),
              },
              { key: "quantity", label: t("project_equipment:columns.quantity") },
              {
                key: "cost_per_period",
                label: t("project_equipment:columns.costPerPeriod"),
                isCurrency: true,
              },
              {
                key: "period_unit",
                label: t("project_equipment:columns.periodUnit"),
              },
              {
                key: "usage_duration",
                label: t("project_equipment:columns.usageDuration"),
              },
              {
                key: "maintenance_cost",
                label: t("project_equipment:columns.maintenance"),
                isCurrency: true,
              },
              {
                key: "fuel_cost",
                label: t("project_equipment:columns.fuel"),
                isCurrency: true,
              },
            ]}
            groups={groups}
            currency={project.currency}
            formatCurrency={formatCurrency}
            getOptionLabel={getOptionLabel}
            t={t}
          />
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:additional")}
          </h4>
          <GroupedCostTable
            items={additional}
            itemType="additional"
            columns={[
              {
                key: "category",
                label: t("project_additional:columns.category"),
              },
              {
                key: "description",
                label: t("project_additional:columns.description"),
              },
              {
                key: "amount",
                label: t("project_additional:columns.amount"),
                isCurrency: true,
              },
            ]}
            groups={groups}
            currency={project.currency}
            formatCurrency={formatCurrency}
            getOptionLabel={getOptionLabel}
            t={t}
          />
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:risks")}
          </h4>
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("project_risk:fields.description")}
                  </TableHead>
                  <TableHead className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("project_risk:fields.probability")}
                  </TableHead>
                  <TableHead className="text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("project_risk:fields.impactAmount")} ({project.currency})
                  </TableHead>
                  <TableHead className="text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("project_risk:fields.riskContingency")} ({project.currency})
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((risk, index) => (
                  <TableRow
                    key={risk.id || index}
                    className="border-t border-border"
                  >
                    <TableCell className="text-foreground">
                      {risk.description}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getOptionLabel("risk_probability", risk.probability)}
                    </TableCell>
                    <TableCell className="text-end text-foreground">
                      {formatCurrency(risk.impact_amount, project.currency)}
                    </TableCell>
                    <TableCell className="text-end font-medium text-foreground">
                      {formatCurrency(
                        risk.contingency_amount,
                        project.currency,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {risks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-4"
                    >
                      {t("common:noItems")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted">
                  <TableCell
                    colSpan={3}
                    className="text-end font-semibold uppercase text-foreground"
                  >
                    {t("project_risk:totalRiskContingency")}
                  </TableCell>
                  <TableCell className="text-end font-bold text-foreground">
                    {formatCurrency(
                      calculateCategoryTotal.risks(risks),
                      project.currency,
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        <h3 className="text-xl font-bold text-foreground mb-4">
          {t("project_reports:financialSummary")}
        </h3>
        <ReportFinancialSummary
          financials={financials}
          project={project}
          formatCurrency={formatCurrency}
          t={t}
        />
      </div>
    );
  },
);

ProjectCostReport.displayName = "ProjectCostReport";
