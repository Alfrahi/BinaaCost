import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";
import {
  calculateProjectFinancials,
  DEFAULT_FINANCIAL_SETTINGS,
  hasConfirmedFinancialSettings,
} from "@/shared/logic/financials";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { StatCard } from "@/shared/components/ui/stat-card";
import { Heading } from "@/shared/components/ui/heading";
import { countIncompleteItems } from "@/shared/logic/overview";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import {
  prepareProjectChartData,
  getPieChartOptions,
} from "@/shared/logic/analytics";
import { useTheme } from "@/app/providers/ThemeContext";
import ReactECharts from "echarts-for-react";
import LoadingState from "@/shared/components/ui/LoadingState";

const LazyChartContainer = React.lazy(
  () => import("@/shared/components/ChartContainer"),
);

interface OverviewTabProps {
  project: any;
  sizeUnits: { value: string; label: string }[];
  projectTypes: { value: string; label: string }[];
  durationUnits: { value: string; label: string }[];
  materials?: MaterialItem[];
  labor?: LaborItem[];
  equipment?: EquipmentItem[];
  additional?: AdditionalCostItem[];
  totals?: {
    materialsTotal: number;
    laborTotal: number;
    equipmentTotal: number;
    additionalTotal: number;
  };
  onAddCosts?: () => void;
}

export default React.memo(function OverviewTab(props: OverviewTabProps) {
  const { theme } = useTheme();
  const {
    project,
    sizeUnits,
    projectTypes,
    durationUnits,
    totals,
  } = props;

  const { t } = useTranslation([
    "project_overview",
    "project_tabs",
    "durations",
    "common",
  ]);
  const { format } = useCurrencyFormatter();
  const { formatDate } = useDateFormatter();

  const translatedType =
    projectTypes.find((pt) => pt.value === project.type)?.label ||
    project.type;

  const sizeUnitLabel =
    sizeUnits.find((u) => u.value === project.size_unit)?.label ||
    project.size_unit;

  const durationUnitLabel =
    durationUnits.find((u) => u.value === project.duration_unit)?.label ||
    project.duration_unit
      ? t(`durations:${project.duration_unit.toLowerCase()}`)
      : t("common:notSpecified");

  const settings = project.financial_settings ?? DEFAULT_FINANCIAL_SETTINGS;
  const financials = calculateProjectFinancials(
    totals ?? {
      materialsTotal: 0,
      laborTotal: 0,
      equipmentTotal: 0,
      additionalTotal: 0,
    },
    settings,
  );

  const { chartData } = useMemo(
    () =>
      prepareProjectChartData(
        {
          materialsTotal: financials.materialsTotal,
          laborTotal: financials.laborTotal,
          equipmentTotal: financials.equipmentTotal,
          additionalTotal: financials.additionalTotal,
        },
        t,
      ),
    [financials, t],
  );

  const pieChartOptions = useMemo(
    () => getPieChartOptions(chartData, project.currency, format),
    [chartData, project.currency, format],
  );

  const incompleteCount = countIncompleteItems(props);
  const settingsConfirmed = hasConfirmedFinancialSettings(project);
  const needsAttention = incompleteCount > 0 || !settingsConfirmed;

  return (
    <div className="space-y-6 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={t("project_overview:grandTotal")}
          value={format(financials.grandTotal, project.currency)}
        />
        <StatCard
          label={t("project_overview:directCosts")}
          value={format(financials.directCosts, project.currency)}
        />
        <StatCard
          label={t("project_overview:profit")}
          value={format(financials.markupAmount, project.currency)}
          hint={
            financials.grandTotal > 0
              ? `${((financials.markupAmount / financials.grandTotal) * 100).toFixed(1)}%`
              : undefined
          }
        />
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <Heading level={4} className="mb-4">
          {t("project_overview:costBreakdown")}
        </Heading>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="space-y-3 text-sm lg:col-span-7">
            {(
              [
                {
                  key: "materials",
                  label: t("project_overview:categories.materials"),
                  value: financials.materialsTotal,
                },
                {
                  key: "labor",
                  label: t("project_overview:categories.labor"),
                  value: financials.laborTotal,
                },
                {
                  key: "equipment",
                  label: t("project_overview:categories.equipment"),
                  value: financials.equipmentTotal,
                },
                {
                  key: "additional",
                  label: t("project_overview:categories.additional"),
                  value: financials.additionalTotal,
                },
              ] as const
            ).map((cat) => {
              const share = financials.directCosts
                ? cat.value / financials.directCosts
                : 0;
              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="tabular-nums font-medium">
                      {format(cat.value, project.currency)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-sm bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.round(share * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-5 h-[220px] justify-center border-t lg:border-t-0 lg:border-s lg:ps-6 pt-4 lg:pt-0">
            {financials.directCosts === 0 ? (
              <p className="text-xs text-muted-foreground text-center">
                {t("common:noData")}
              </p>
            ) : (
              <React.Suspense
                fallback={
                  <div className="h-[200px] flex items-center justify-center">
                    <LoadingState className="py-0" />
                  </div>
                }
              >
                <LazyChartContainer>
                  <div dir="ltr" className="h-[220px] w-full">
                    <ReactECharts theme={theme === "dark" ? "dark" : undefined}
                      option={pieChartOptions}
                      style={{ height: "100%", width: "100%" }}
                    />
                  </div>
                </LazyChartContainer>
              </React.Suspense>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <Heading level={4} className="mb-2">
          {t("project_overview:attention")}
        </Heading>
        {!needsAttention ? (
          <p className="text-sm text-muted-foreground">
            {t("project_overview:allGood")}
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground list-disc ps-5">
            {incompleteCount > 0 && (
              <li>
                {t("project_overview:incompleteItems", {
                  count: incompleteCount,
                })}
              </li>
            )}
            {!settingsConfirmed && (
              <li>{t("project_overview:unconfirmedSettings")}</li>
            )}
          </ul>
        )}
        {project.updated_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("project_overview:lastEdited", {
              date: formatDate(project.updated_at, "dateTime"),
            })}
          </p>
        )}
      </div>

      <div className="bg-card rounded-lg shadow p-4 sm:p-6 text-sm border border-border/60">
        <Heading level={5} className="text-muted-foreground mb-2">
          {t("project_overview:details")}
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold">{t("project_overview:type")}</div>
            <div className="text-muted-foreground">{translatedType}</div>
          </div>
          <div>
            <div className="font-semibold">{t("project_overview:size")}</div>
            <div className="text-muted-foreground">
              {project.size} {sizeUnitLabel}
            </div>
          </div>
          <div>
            <div className="font-semibold">
              {t("project_overview:location")}
            </div>
            <div className="text-muted-foreground">
              {project.location || t("common:notSpecified")}
            </div>
          </div>
          <div>
            <div className="font-semibold">
              {t("project_overview:duration")}
            </div>
            <div className="text-muted-foreground">
              {project.duration_days} {durationUnitLabel}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="font-semibold">
              {t("project_overview:clientRequirements")}
            </div>
            <div className="text-muted-foreground">
              {project.client_requirements || t("common:notSpecified")}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="font-semibold">
              {t("project_overview:description")}
            </div>
            <div className="text-muted-foreground">
              {project.description || t("common:notSpecified")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
