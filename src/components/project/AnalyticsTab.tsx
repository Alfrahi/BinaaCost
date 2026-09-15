import React, { Suspense, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactECharts from "echarts-for-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  prepareProjectChartData,
  getPieChartOptions,
  getBarChartOptions,
} from "@/logic/analytics";
import { CHART_CONTAINER_HEIGHT_CLASSES } from "@/components/ChartContainer";
import { cn } from "@/lib/utils";
import LoadingState from "@/components/ui/LoadingState";

const LazyChartContainer = React.lazy(
  () => import("@/components/ChartContainer"),
);

export default function AnalyticsTab({
  materialsTotal,
  laborTotal,
  equipmentTotal,
  additionalTotal,
  currency,
}: {
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
  currency: string;
}) {
  const { t } = useTranslation(["project_detail", "project_tabs", "common"]);
  const { format } = useCurrencyFormatter();

  const { chartData, totalCost } = useMemo(
    () =>
      prepareProjectChartData(
        { materialsTotal, laborTotal, equipmentTotal, additionalTotal },
        t,
      ),
    [materialsTotal, laborTotal, equipmentTotal, additionalTotal, t],
  );

  const pieChartOptions = useMemo(
    () => getPieChartOptions(chartData, currency, format),
    [chartData, currency, format],
  );

  const barChartOptions = useMemo(
    () => getBarChartOptions(chartData, currency, format, t),
    [chartData, currency, format, t],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("project_detail:analytics.costBreakdown")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <p>{t("project_detail:analytics.chartTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {t("project_tabs:materials")}
              </h3>
              <p className="text-2xl">{format(materialsTotal, currency)}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {t("project_tabs:labor")}
              </h3>
              <p className="text-2xl">{format(laborTotal, currency)}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {t("project_tabs:equipment")}
              </h3>
              <p className="text-2xl">{format(equipmentTotal, currency)}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {t("project_tabs:additional")}
              </h3>
              <p className="text-2xl">{format(additionalTotal, currency)}</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">{t("common:total")}</h3>
            <p className="text-3xl font-bold">{format(totalCost, currency)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("project_detail:analytics.costDistribution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className={cn(CHART_CONTAINER_HEIGHT_CLASSES,"flex items-center justify-center")}>
                <LoadingState className="py-0" />
              </div>
            }
          >
            <LazyChartContainer>
              {/* Force LTR on chart canvas; ECharts has no native RTL support.
                  Wrapping in dir="ltr" prevents browser RTL mirroring of the canvas.
                  Axis labels and legend use translated keys, so they render correctly. */}
              <div dir="ltr" className="h-full w-full">
                <ReactECharts
                  option={pieChartOptions}
                  style={{ height: "100%", width: "100%" }}
                />
              </div>
            </LazyChartContainer>
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("project_detail:analytics.totalCost")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className={cn(CHART_CONTAINER_HEIGHT_CLASSES,"flex items-center justify-center")}>
                <LoadingState className="py-0" />
              </div>
            }
          >
            <LazyChartContainer>
              {/* Force LTR on chart canvas; ECharts has no native RTL support.
                  Wrapping in dir="ltr" prevents browser RTL mirroring of the canvas.
                  Axis labels and legend use translated keys, so they render correctly. */}
              <div dir="ltr" className="h-full w-full">
                <ReactECharts
                  option={barChartOptions}
                  style={{ height: "100%", width: "100%" }}
                />
              </div>
            </LazyChartContainer>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
