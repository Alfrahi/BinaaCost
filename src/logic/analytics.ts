import { safeAdd } from "@/utils/math";
import {
  COST_CATEGORY_COLORS,
  CHART_EMPHASIS_SHADOW,
} from "@/logic/chartPalette";

export interface CostCategoryTotals {
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
}

export interface ChartDataItem {
  name: string;
  value: number;
}

export function prepareProjectChartData(
  totals: CostCategoryTotals,
  t: (key: string, options?: any) => string,
): { chartData: ChartDataItem[]; totalCost: number } {
  const chartData: ChartDataItem[] = [
    { name: t("project_tabs:materials"), value: totals.materialsTotal },
    { name: t("project_tabs:labor"), value: totals.laborTotal },
    { name: t("project_tabs:equipment"), value: totals.equipmentTotal },
    { name: t("project_tabs:additional"), value: totals.additionalTotal },
  ];

  const totalCost = safeAdd(
    totals.materialsTotal,
    totals.laborTotal,
    totals.equipmentTotal,
    totals.additionalTotal,
  );

  return { chartData, totalCost };
}

export function getPieChartOptions(
  chartData: ChartDataItem[],
  currency: string,
  formatCurrency: (
    value: number,
    currencyCode: string,
    options?: any,
  ) => string,
) {
  return {
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        return `${params.name}: ${formatCurrency(params.value, currency)} (${params.percent}%)`;
      },
    },
    series: [
      {
        type: "pie",
        radius: "60%",
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: CHART_EMPHASIS_SHADOW,
          },
        },
      },
    ],
  };
}

export function getBarChartOptions(
  chartData: ChartDataItem[],
  currency: string,
  formatCurrency: (
    value: number,
    currencyCode: string,
    options?: any,
  ) => string,
  t: (key: string, options?: any) => string,
) {
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: (params: any) => {
        return `${params[0].name}: ${formatCurrency(params[0].value, currency)}`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      name: t("common:amount"),
      axisLabel: {
        formatter: (value: number) => formatCurrency(value, currency),
      },
    },
    yAxis: {
      type: "category",
      data: chartData.map((item) => item.name),
    },
    series: [
      {
        type: "bar",
        data: chartData.map((item) => item.value),
        itemStyle: {
          color: (params: any) =>
            COST_CATEGORY_COLORS[
              params.dataIndex % COST_CATEGORY_COLORS.length
            ],
        },
      },
    ],
  };
}
