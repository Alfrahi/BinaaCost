

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import ReactECharts from "echarts-for-react";
import { SCENARIO_COLORS } from "@/shared/logic/chartPalette";
import ChartContainer from "@/shared/components/ChartContainer";
import { SimulationResult } from "@/features/projects/project-analytics/types/scenario";

interface SimulationResultsProps {
  simulationResult: SimulationResult | null;
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

  const originalFinancials = simulationResult?.original?.financials;
  const simulatedFinancials = simulationResult?.simulated?.financials;

  const hasData = !!simulationResult && !!originalFinancials && !!simulatedFinancials;

  // Data refs for useMemo (safe because useMemo only accesses them if hasData)
  const of = originalFinancials;
  const sf = simulatedFinancials;

  // Always called at top level - returns safe empty object when no data
  const chartOptions = useMemo(() => {
    if (!hasData || !of || !sf) return {};

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
      of.materialsTotal,
      of.laborTotal,
      of.equipmentTotal,
      of.additionalTotal,
      of.overheadAmount,
      of.contingencyAmount,
      of.markupAmount,
      of.taxAmount,
    ];

    const simulatedData = [
      sf.materialsTotal,
      sf.laborTotal,
      sf.equipmentTotal,
      sf.additionalTotal,
      sf.overheadAmount,
      sf.contingencyAmount,
      sf.markupAmount,
      sf.taxAmount,
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
  }, [hasData, of, sf, currency, format, t, i18n]);

  const rows = useMemo(() => {
    if (!hasData || !of || !sf) return [];

    return [
      { label: t("project_tabs:materials"), original: of.materialsTotal, simulated: sf.materialsTotal },
      { label: t("project_tabs:labor"), original: of.laborTotal, simulated: sf.laborTotal },
      { label: t("project_tabs:equipment"), original: of.equipmentTotal, simulated: sf.equipmentTotal },
      { label: t("project_tabs:additional"), original: of.additionalTotal, simulated: sf.additionalTotal },
      { label: t("project_detail:profit_pricing.totalDirectCosts"), original: of.directCosts, simulated: sf.directCosts, isBold: true },
      { label: t("project_detail:profit_pricing.overhead"), original: of.overheadAmount, simulated: sf.overheadAmount },
      { label: t("project_detail:profit_pricing.generalContingency"), original: of.contingencyAmount, simulated: sf.contingencyAmount },
      { label: t("project_detail:profit_pricing.primeCost"), original: of.primeCost, simulated: sf.primeCost, isBold: true },
      { label: t("project_detail:profit_pricing.markup"), original: of.markupAmount, simulated: sf.markupAmount },
      { label: t("project_detail:profit_pricing.subtotalBeforeTax"), original: of.bidPrice, simulated: sf.bidPrice, isBold: true },
      { label: t("project_detail:profit_pricing.taxes"), original: of.taxAmount, simulated: sf.taxAmount },
      { label: t("project_detail:profit_pricing.finalProjectTotal"), original: of.grandTotal, simulated: sf.grandTotal, isBold: true, isPrimary: true },
    ];
  }, [hasData, of, sf, t]);

  if (!hasData) {
    return (
      <Card className="border-2 border-border shadow-md">
        <CardHeader className="flex-row items-center justify-between pb-4">
          <CardTitle>{t("simulationResults")}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common:close")}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">{t("common:noDataAvailable")}</p>
        </CardContent>
      </Card>
    );
  }

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