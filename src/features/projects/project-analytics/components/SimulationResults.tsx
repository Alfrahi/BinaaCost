"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import ReactECharts from "echarts-for-react";
import { FinancialSummary } from "@/shared/logic/financials";
import { SCENARIO_COLORS } from "@/shared/logic/chartPalette";
import ChartContainer from "@/shared/components/ChartContainer";

interface SimulationResultsProps {
  simulationResult: any;
  currency: string;
  onClose: () => void;
}

export function SimulationResults({
  simulationResult,
  currency,
  onClose,
}: SimulationResultsProps) {
  const { t, i18n } = useTranslation(["scenario_analysis", "project_tabs", "project_detail"]);
  const { format } = useCurrencyFormatter();

  const originalFinancials = simulationResult?.original.financials as FinancialSummary;
  const simulatedFinancials = simulationResult?.simulated.financials as FinancialSummary;

  const chartOptions = useMemo(() => {
    if (!simulationResult || !originalFinancials || !simulatedFinancials) return {};

    const categories = [
      t("project_tabs:materials"),
      t("project_tabs:labor"),
      t("project_tabs:equipment"),
      t("project_tabs:additional"),
      t("project_detail:profit_pricing.overhead"),
      t("project_detail:profit_pricing.generalContingency"),
      t("project_detail:profit_pricing.markup"),
      t("project_detail:profit_pricing.taxes"),
    ];

    const originalData = [
      originalFinancials.materialsTotal,
      originalFinancials.laborTotal,
      originalFinancials.equipmentTotal,
      originalFinancials.additionalTotal,
      originalFinancials.overheadAmount,
      originalFinancials.contingencyAmount,
      originalFinancials.markupAmount,
      originalFinancials.taxAmount,
    ];

    const simulatedData = [
      simulatedFinancials.materialsTotal,
      simulatedFinancials.laborTotal,
      simulatedFinancials.equipmentTotal,
      simulatedFinancials.additionalTotal,
      simulatedFinancials.overheadAmount,
      simulatedFinancials.contingencyAmount,
      simulatedFinancials.markupAmount,
      simulatedFinancials.taxAmount,
    ];

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          let res = `<b>${params[0].name}</b><br/>`;
          params.forEach((item: any) => {
            res += `${item.marker} ${item.seriesName}: ${format(item.value, currency)}<br/>`;
          });
          return res;
        },
      },
      legend: { data: [t("original"), t("simulated")], bottom: 0 },
      grid: { left: "3%", right: "4%", top: "10%", bottom: "15%", containLabel: true },
      xAxis: {
        type: "value",
        axisLabel: { formatter: (value: number) => format(value, currency, { compact: true }) },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          formatter: (value: string) => (value.length > 15 ? value.substring(0, 15) + "..." : value),
          interval: 0,
          rotate: i18n.dir() === "rtl" ? 45 : 0,
        },
      },
      series: [
        { name: t("original"), type: "bar", stack: "total", data: originalData, itemStyle: { color: SCENARIO_COLORS.original } },
        { name: t("simulated"), type: "bar", stack: "total", data: simulatedData, itemStyle: { color: SCENARIO_COLORS.simulated } },
      ],
    };
  }, [simulationResult, originalFinancials, simulatedFinancials, currency, format, t, i18n]);

  const rows = [
    { label: t("project_tabs:materials"), original: originalFinancials.materialsTotal, simulated: simulatedFinancials.materialsTotal },
    { label: t("project_tabs:labor"), original: originalFinancials.laborTotal, simulated: simulatedFinancials.laborTotal },
    { label: t("project_tabs:equipment"), original: originalFinancials.equipmentTotal, simulated: simulatedFinancials.equipmentTotal },
    { label: t("project_tabs:additional"), original: originalFinancials.additionalTotal, simulated: simulatedFinancials.additionalTotal },
    { label: t("project_detail:profit_pricing.totalDirectCosts"), original: originalFinancials.directCosts, simulated: simulatedFinancials.directCosts, isBold: true },
    { label: t("project_detail:profit_pricing.overhead"), original: originalFinancials.overheadAmount, simulated: simulatedFinancials.overheadAmount },
    { label: t("project_detail:profit_pricing.generalContingency"), original: originalFinancials.contingencyAmount, simulated: simulatedFinancials.contingencyAmount },
    { label: t("project_detail:profit_pricing.primeCost"), original: originalFinancials.primeCost, simulated: simulatedFinancials.primeCost, isBold: true },
    { label: t("project_detail:profit_pricing.markup"), original: originalFinancials.markupAmount, simulated: simulatedFinancials.markupAmount },
    { label: t("project_detail:profit_pricing.subtotalBeforeTax"), original: originalFinancials.bidPrice, simulated: simulatedFinancials.bidPrice, isBold: true },
    { label: t("project_detail:profit_pricing.taxes"), original: originalFinancials.taxAmount, simulated: simulatedFinancials.taxAmount },
    { label: t("project_detail:profit_pricing.finalProjectTotal"), original: originalFinancials.grandTotal, simulated: simulatedFinancials.grandTotal, isBold: true, isPrimary: true },
  ];

  return (
    <Card className="border-2 border-border shadow-md">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>{t("simulationResults")}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common:close")}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <h4 className="font-semibold text-base mb-2">{t("financialSummary")}</h4>
          <div className="overflow-x-auto border rounded-lg">
            <Table className="min-w-full divide-y divide-border">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="px-3 py-2 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted h-10">{t("category")}</TableHead>
                  <TableHead className="px-3 py-2 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted h-10 tabular-nums">{t("original")}</TableHead>
                  <TableHead className="px-3 py-2 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted h-10 tabular-nums">{t("simulated")}</TableHead>
                  <TableHead className="px-3 py-2 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted h-10 tabular-nums">{t("difference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card divide-y divide-border">
                {rows.map((row, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      row.isPrimary ? "bg-muted" : row.isBold && "bg-muted",
                      row.isPrimary ? "font-bold text-primary" : row.isBold && "font-semibold",
                    )}
                  >
                    <TableCell className={cn("px-3 py-2 text-sm", row.isBold && "font-semibold", "text-start")}>{row.label}</TableCell>
                    <TableCell className="px-3 py-2 text-end text-sm tabular-nums">{format(row.original, currency)}</TableCell>
                    <TableCell className="px-3 py-2 text-end text-sm tabular-nums">{format(row.simulated, currency)}</TableCell>
                    <TableCell className={cn("px-3 py-2 text-end text-sm tabular-nums", row.simulated - row.original > 0 ? "text-destructive" : "text-success")}>
                      {format(row.simulated - row.original, currency, { showSign: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-base mb-2">{t("costComparison")}</h4>
          <ChartContainer>
            <div dir="ltr" className="h-full w-full">
              <ReactECharts option={chartOptions} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} />
            </div>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}