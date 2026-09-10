import React, { Suspense } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { ProjectCostData } from "../types";
import { cn } from "@/lib/utils";

const LazyChartContainer = React.lazy(
  () => import("@/components/ChartContainer"),
);

const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function ProjectComparisonChart({
  projects,
  displayCurrency,
  className,
}: {
  projects: ProjectCostData[];
  displayCurrency: string;
  className?: string;
}) {
  const { t } = useTranslation(["pages", "project_tabs", "common"]);
  const { format } = useCurrencyFormatter();

  const sortedProjects = [...projects].sort(
    (a, b) => b.total_cost - a.total_cost,
  );

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {t("pages:analytics.projectCost")}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {t("pages:analytics.projectCostTooltip")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] min-h-[50vh] w-full">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            }
          >
            <LazyChartContainer>
              {/* Force LTR on chart canvas; ECharts has no native RTL support.
                  Wrapping in dir="ltr" prevents browser RTL mirroring of the canvas.
                  Axis labels and legend use translated keys, so they render correctly. */}
              <div dir="ltr">
                <ReactECharts
                option={{
                  tooltip: {
                    trigger: "axis",
                    axisPointer: {
                      type: "shadow",
                    },
                    formatter: (params: any) => {
                      const project = sortedProjects[params[0].dataIndex];
                      return `
                        <div>
                          <strong>${project.name}</strong><br/>
                          ${t("project_tabs:materials")}: ${format(project.materials_cost, displayCurrency)}<br/>
                          ${t("project_tabs:labor")}: ${format(project.labor_cost, displayCurrency)}<br/>
                          ${t("project_tabs:equipment")}: ${format(project.equipment_cost, displayCurrency)}<br/>
                          ${t("project_tabs:additional")}: ${format(project.additional_cost, displayCurrency)}<br/>
                          <strong>${t("common:total")}: ${format(project.total_cost, displayCurrency)}</strong>
                        </div>
                      `;
                    },
                  },
                  legend: {
                    data: [
                      t("project_tabs:materials"),
                      t("project_tabs:labor"),
                      t("project_tabs:equipment"),
                      t("project_tabs:additional"),
                    ],
                    bottom: "0%",
                  },
                  grid: {
                    left: "3%",
                    right: "4%",
                    bottom: "15%",
                    containLabel: true,
                  },
                  xAxis: {
                    type: "value",
                    axisLabel: {
                      formatter: (value: number) =>
                        format(value, displayCurrency, { notation: "compact" }),
                    },
                  },
                  yAxis: {
                    type: "category",
                    data: sortedProjects.map((p) => p.name),
                    axisLabel: {
                      formatter: (value: string) => {
                        return value.length > 20
                          ? value.substring(0, 17) + "..."
                          : value;
                      },
                    },
                  },
                  series: [
                    {
                      name: t("project_tabs:materials"),
                      type: "bar",
                      stack: "total",
                      data: sortedProjects.map((p) => p.materials_cost),
                      itemStyle: { color: CHART_COLORS[0] },
                    },
                    {
                      name: t("project_tabs:labor"),
                      type: "bar",
                      stack: "total",
                      data: sortedProjects.map((p) => p.labor_cost),
                      itemStyle: { color: CHART_COLORS[1] },
                    },
                    {
                      name: t("project_tabs:equipment"),
                      type: "bar",
                      stack: "total",
                      data: sortedProjects.map((p) => p.equipment_cost),
                      itemStyle: { color: CHART_COLORS[2] },
                    },
                    {
                      name: t("project_tabs:additional"),
                      type: "bar",
                      stack: "total",
                      data: sortedProjects.map((p) => p.additional_cost),
                      itemStyle: { color: CHART_COLORS[3] },
                    },
                  ],
                }}
                style={{ height: "100%", width: "100%" }}
              />
              </div>
            </LazyChartContainer>
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
