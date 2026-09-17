import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { ProjectVersion } from "@/features/projects/project-versions/hooks/useProjectVersions";
import {
  computeVersionComparison,
  VersionComparisonResult,
} from "@/shared/logic/versionCosts";
import { cn } from "@/shared/lib/utils";

interface VersionComparisonProps {
  versionA: ProjectVersion;
  versionB: ProjectVersion;
  currency: string;
}

function DeltaCell({
  value,
  currency,
  isPercent = false,
}: {
  value: number;
  currency: string;
  isPercent?: boolean;
}) {
  const { format } = useCurrencyFormatter();
  const { t } = useTranslation(["project_versions"]);
  const isPositive = value > 0;
  const isNegative = value < 0;
  return (
    <TableCell
      className={cn(
        "text-end tabular-nums font-medium",
        isPositive && "text-destructive",
        isNegative && "text-success",
        !isPositive && !isNegative && "text-muted-foreground",
      )}
    >
      {isPositive && "▲ "}
      {isNegative && "▼ "}
      {isPositive || isNegative
        ? isPercent
          ? `${Math.abs(value)}%`
          : format(Math.abs(value), currency)
        : t("noChange")}
    </TableCell>
  );
}

export default function VersionComparison({
  versionA,
  versionB,
  currency,
}: VersionComparisonProps) {
  const { t } = useTranslation(["project_versions", "project_tabs", "common"]);
  const { format } = useCurrencyFormatter();

  const result: VersionComparisonResult = useMemo(
    () => computeVersionComparison(versionA.data, versionB.data),
    [versionA.data, versionB.data],
  );

  const { a, b, deltas } = result;

  const rows: {
    label: string;
    a: number;
    b: number;
    delta: number;
    isPercent?: boolean;
  }[] = [
    { label: t("project_tabs:materials"), a: a.summary.materials, b: b.summary.materials, delta: deltas.materials },
    { label: t("project_tabs:labor"), a: a.summary.labor, b: b.summary.labor, delta: deltas.labor },
    { label: t("project_tabs:equipment"), a: a.summary.equipment, b: b.summary.equipment, delta: deltas.equipment },
    { label: t("project_tabs:additional"), a: a.summary.additional, b: b.summary.additional, delta: deltas.additional },
    { label: t("directTotal"), a: a.summary.directTotal, b: b.summary.directTotal, delta: deltas.directTotal },
    { label: t("overheadPercent"), a: a.settings.overhead_percent, b: b.settings.overhead_percent, delta: b.settings.overhead_percent - a.settings.overhead_percent, isPercent: true },
    { label: t("markupPercent"), a: a.settings.markup_percent, b: b.settings.markup_percent, delta: b.settings.markup_percent - a.settings.markup_percent, isPercent: true },
    { label: t("taxPercent"), a: a.settings.tax_percent, b: b.settings.tax_percent, delta: b.settings.tax_percent - a.settings.tax_percent, isPercent: true },
    { label: t("contingencyPercent"), a: a.settings.contingency_percent, b: b.settings.contingency_percent, delta: b.settings.contingency_percent - a.settings.contingency_percent, isPercent: true },
    { label: t("common:total"), a: a.financials.grandTotal, b: b.financials.grandTotal, delta: deltas.grandTotal },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("compareTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10 px-3">{t("common:item")}</TableHead>
                <TableHead className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10 px-3">{versionA.name}</TableHead>
                <TableHead className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10 px-3">{versionB.name}</TableHead>
                <TableHead className="text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10 px-3">{t("delta")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="text-start text-sm font-medium px-3 py-2">{row.label}</TableCell>
                  <TableCell className="text-end tabular-nums text-sm px-3 py-2">{row.isPercent ? `${row.a}%` : format(row.a, currency)}</TableCell>
                  <TableCell className="text-end tabular-nums text-sm px-3 py-2">{row.isPercent ? `${row.b}%` : format(row.b, currency)}</TableCell>
                  <DeltaCell value={row.delta} currency={currency} isPercent={row.isPercent} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}