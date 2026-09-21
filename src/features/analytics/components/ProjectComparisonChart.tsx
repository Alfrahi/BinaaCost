import { CHART_CONTAINER_HEIGHT_CLASSES } from "@/shared/components/ChartContainer";
import React, { Suspense } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { ProjectCostData } from "../types";
import { cn } from "@/shared/lib/utils";
import { COST_CATEGORY_COLORS } from "@/shared/logic/chartPalette";
import { useTheme } from "@/app/providers/ThemeContext";

import LoadingState from "@/shared/components/ui/LoadingState";

const LazyChartContainer = React.lazy(
  () => import("@/shared/components/ChartContainer"),
);

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
  const { theme } = useTheme();

  const sortedProjects = [...projects].sort(
    (a, b) => b.total_cost - a.total_cost,
  );

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
        <Suspense
          fallback={
            <div
              className={cn(
                CHART_CONTAINER_HEIGHT_CLASSES,
                "flex items-center justify-center",
              )}
            >
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
                  theme={theme === "dark" ? "dark" : undefined}
                  option={{
                    backgroundColor: "transparent",
                    tooltip: {
                      trigger: "axis",
                      backgroundColor: theme === "dark" ? "#0F172A" : "#FFFFFF",
                      borderColor: theme === "dark" ? "#1E293B" : "#E5E7EB",
                      textStyle: {
                        color: theme === "dark" ? "#FAFAFA" : "#000000",
                      },
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
                      textStyle: {
                        color: theme === "dark" ? "#9CA3AF" : undefined,
                      },
                    },
                    grid: {
                      left: "3%",
                      right: "4%",
                      bottom: "15%",
                      containLabel: true,
                    },
                    xAxis: {
                      type: "value",
                      splitLine: {
                        lineStyle: {
                          color: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#E5E7EB",
                        },
                      },
                      axisLabel: {
                        color: theme === "dark" ? "#9CA3AF" : undefined,
                        formatter: (value: number) =>
                          format(value, displayCurrency, { notation: "compact" }),
                      },
                    },
                    yAxis: {
                      type: "category",
                      data: sortedProjects.map((p) => p.name),
                      axisLabel: {
                        color: theme === "dark" ? "#9CA3AF" : undefined,
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
                      itemStyle: { color: COST_CATEGORY_COLORS[0] },
                    },
                    {
                      name: t("project_tabs:labor"),
                      type: "bar",
                      stack: "total",
                      data: sortedProjects.map((p) => p.labor_cost),
                      itemStyle: { color: COST_CATEGORY_COLORS[1] },
                    },
                    {
                      name: t("project_tabs:equipment"),
                      type: "bar",
                      stack: "total",
                      data: sortedProjects.map((p) => p.equipment_cost),
                      itemStyle: { color: COST_CATEGORY_COLORS[2] },
                    },
                    {
                      name: t("project_tabs:additional"),
                      type: "bar",
                      stack: "total",
                      data: sortedProjects.map((p) => p.additional_cost),
                      itemStyle: { color: COST_CATEGORY_COLORS[3] },
                    },
                  ],
                }}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </LazyChartContainer>
        </Suspense>
      </CardContent>
    </Card>
  );
}
