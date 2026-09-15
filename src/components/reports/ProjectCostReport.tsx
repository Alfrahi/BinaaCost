import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormatter } from "@/hooks/useDateFormatter";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { FinancialSummary } from "@/logic/financials";
import { calculateItemCost, calculateCategoryTotal } from "@/logic/shared";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
  Risk,
  ProjectGroup,
} from "@/types/project-items";

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

    const getOptionLabel = (category: string, value: string) => {
      const options =
        allSettingsOptions[category as keyof typeof allSettingsOptions];
      return options?.find((opt) => opt.value === value)?.label || value;
    };

    const { formatDate } = useDateFormatter();

    const renderCostTable = (
      items: any[],
      itemType: "materials" | "labor" | "equipment" | "additional",
      columns: {
        key: string;
        label: string;
        isCurrency?: boolean;
        align?: "start" | "end";
      }[],
    ) => {
      const groupedItems: Record<string, any[]> = {};
      items.forEach((item) => {
        const groupId = item.group_id || "ungrouped";
        if (!groupedItems[groupId]) {
          groupedItems[groupId] = [];
        }
        groupedItems[groupId].push(item);
      });

      const sortedGroupIds = [...groups.map((g) => g.id), "ungrouped"].filter(
        (id) => groupedItems[id] && groupedItems[id].length > 0,
      );

      return (
        <div className="overflow-x-auto">
          {" "}
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="bg-muted">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`text-${col.align || "start"} text-xs font-medium text-muted-foreground uppercase`}
                  >
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="text-end text-xs font-medium text-muted-foreground uppercase">
                  {t("common:total")} ({project.currency})
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGroupIds.map((groupId) => (
                <React.Fragment key={groupId}>
                  {groupId !== "ungrouped" && (
                    <TableRow className="bg-muted">
                      <TableCell
                        colSpan={columns.length + 1}
                        className="font-semibold text-foreground"
                      >
                        {groups.find((g) => g.id === groupId)?.name}
                      </TableCell>
                    </TableRow>
                  )}
                  {groupedItems[groupId].map((item: any, index: number) => {
                    let itemTotal = 0;
                    switch (itemType) {
                      case "materials":
                        itemTotal = calculateItemCost.material(
                          item.quantity,
                          item.unit_price,
                        );
                        break;
                      case "labor":
                        itemTotal = calculateItemCost.labor(
                          item.number_of_workers,
                          item.daily_rate,
                          item.total_days,
                        );
                        break;
                      case "equipment":
                        itemTotal = calculateItemCost.equipment({
                          quantity: item.quantity,
                          costPerPeriod: item.cost_per_period,
                          usageDuration: item.usage_duration,
                          maintenanceCost: item.maintenance_cost,
                          fuelCost: item.fuel_cost,
                        }).totalCost;
                        break;
                      case "additional":
                        itemTotal = item.amount;
                        break;
                    }

                    return (
                      <TableRow
                        key={item.id || index}
                        className="border-t border-border"
                      >
                        {columns.map((col) => (
                          <TableCell
                            key={col.key}
                            className={`text-${col.align || "start"} text-foreground`}
                          >
                            {col.isCurrency
                              ? formatCurrency(item[col.key], project.currency)
                              : col.key === "unit" && itemType === "materials"
                                ? getOptionLabel("material_unit", item[col.key])
                                : col.key === "period_unit" &&
                                    itemType === "equipment"
                                  ? getOptionLabel(
                                      "equipment_period_unit",
                                      item[col.key],
                                    )
                                  : col.key === "category" &&
                                      itemType === "additional"
                                    ? getOptionLabel(
                                        "additional_cost_category",
                                        item[col.key],
                                      )
                                    : item[col.key] || t("common:notSpecified")}
                          </TableCell>
                        ))}
                        <TableCell className="text-end font-medium text-foreground">
                          {formatCurrency(itemTotal, project.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
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
                  colSpan={columns.length}
                  className="text-end font-semibold uppercase text-foreground"
                >
                  {t("common:subtotal")}
                </TableCell>
                <TableCell className="text-end font-bold text-foreground">
                  {formatCurrency(
                    calculateCategoryTotal[itemType](items as any),
                    project.currency,
                  )}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      );
    };

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

        <Separator className="my-6 bg-border" />

        {/* Project Details */}
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

        <Separator className="my-6 bg-border" />

        {/* Cost Breakdown */}
        <h3 className="text-xl font-bold text-foreground mb-4">
          {t("project_reports:costBreakdown")}
        </h3>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:materials")}
          </h4>
          {renderCostTable(materials, "materials", [
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
          ])}
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:labor")}
          </h4>
          {renderCostTable(labor, "labor", [
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
          ])}
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:equipment")}
          </h4>
          {renderCostTable(equipment, "equipment", [
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
          ])}
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:additional")}
          </h4>
          {renderCostTable(additional, "additional", [
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
          ])}
        </div>

        <div className="mb-8">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {t("project_tabs:risks")}
          </h4>
          <div className="overflow-x-auto">
            {" "}
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
                    {t("project_risk:fields.riskContingency")} (
                    {project.currency})
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

        {/* Financial Summary */}
        <h3 className="text-xl font-bold text-foreground mb-4">
          {t("project_reports:financialSummary")}
        </h3>
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
              {t(
                "project_detail:profit_pricing.defaultAssumptionsWarning",
              )}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          {" "}
          <Table className="w-full text-sm mb-8">
            <TableBody>
              <TableRow className="bg-muted">
                <TableCell className="font-semibold uppercase text-foreground">
                  {t("project_detail:profit_pricing.totalDirectCosts")}
                </TableCell>
                <TableCell className="text-end font-bold text-foreground">
                  {formatCurrency(financials.directCosts, project.currency)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground">
                  {t("project_detail:profit_pricing.overheadWithPercent", {
                    percent: project.financial_settings.overhead_percent,
                  })}
                </TableCell>
                <TableCell className="text-end text-foreground">
                  {formatCurrency(financials.overheadAmount, project.currency)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground">
                  {t("project_detail:profit_pricing.generalContingencyWithPercent", {
                    percent: project.financial_settings.contingency_percent,
                  })}
                </TableCell>
                <TableCell className="text-end text-foreground">
                  {formatCurrency(
                    financials.contingencyAmount,
                    project.currency,
                  )}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted border-t border-border">
                <TableCell className="font-semibold uppercase text-foreground">
                  {t("project_detail:profit_pricing.primeCost")}
                </TableCell>
                <TableCell className="text-end font-bold text-foreground">
                  {formatCurrency(financials.primeCost, project.currency)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground">
                  {t("project_detail:profit_pricing.markupWithPercent", {
                    percent: project.financial_settings.markup_percent,
                  })}
                </TableCell>
                <TableCell className="text-end text-foreground">
                  {formatCurrency(financials.markupAmount, project.currency)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted border-t border-border">
                <TableCell className="font-semibold uppercase text-foreground">
                  {t("project_detail:profit_pricing.subtotalBeforeTax")}
                </TableCell>
                <TableCell className="text-end font-bold text-foreground">
                  {formatCurrency(financials.bidPrice, project.currency)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t border-border">
                <TableCell className="text-foreground">
                  {t("project_detail:profit_pricing.taxesWithPercent", {
                    percent: project.financial_settings.tax_percent,
                  })}
                </TableCell>
                <TableCell className="text-end text-foreground">
                  {formatCurrency(financials.taxAmount, project.currency)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-primary text-primary-foreground">
                <TableCell className="text-lg font-bold uppercase">
                  {t("project_detail:profit_pricing.finalProjectTotal")}
                </TableCell>
                <TableCell className="text-end text-lg font-bold">
                  {formatCurrency(financials.grandTotal, project.currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  },
);

ProjectCostReport.displayName = "ProjectCostReport";
