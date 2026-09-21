import React from "react";
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
} from "@/shared/components/ui/table";
import { FinancialSummary } from "@/shared/logic/financials";
import { Decimal } from "@/shared/lib/math";

interface ClientProposalFinancialSummaryProps {
  financials: FinancialSummary;
  project: any;
  formatCurrency: (value: number, currency: string) => string;
  t: any;
}

export const ClientProposalFinancialSummary: React.FC<ClientProposalFinancialSummaryProps> = ({
  financials,
  project,
  formatCurrency,
  t,
}) => {
  // Proportional distribution of markup and overhead across direct divisions
  // so the client sees a professional Schedule of Values without leaking internal margins.
  const directTotal = financials.directCosts > 0 ? financials.directCosts : 1;
  const markupRatio = new Decimal(financials.bidPrice).dividedBy(directTotal);

  let matAlloc = financials.materialsTotal > 0
    ? new Decimal(financials.materialsTotal).times(markupRatio).toDecimalPlaces(2)
    : new Decimal(0);
  let labAlloc = financials.laborTotal > 0
    ? new Decimal(financials.laborTotal).times(markupRatio).toDecimalPlaces(2)
    : new Decimal(0);
  let eqAlloc = financials.equipmentTotal > 0
    ? new Decimal(financials.equipmentTotal).times(markupRatio).toDecimalPlaces(2)
    : new Decimal(0);
  let addAlloc = financials.additionalTotal > 0
    ? new Decimal(financials.additionalTotal).times(markupRatio).toDecimalPlaces(2)
    : new Decimal(0);

  // If there's a penny difference due to independent 2dp roundings,
  // absorb it into the largest non-zero allocated category so line items sum exactly to bidPrice.
  const allocatedSum = matAlloc.plus(labAlloc).plus(eqAlloc).plus(addAlloc);
  const diff = new Decimal(financials.bidPrice).minus(allocatedSum);

  if (!diff.isZero()) {
    const categories = [
      { key: "materials", val: matAlloc, base: financials.materialsTotal },
      { key: "labor", val: labAlloc, base: financials.laborTotal },
      { key: "equipment", val: eqAlloc, base: financials.equipmentTotal },
      { key: "additional", val: addAlloc, base: financials.additionalTotal },
    ].filter((c) => c.base > 0);

    if (categories.length > 0) {
      categories.sort((a, b) => b.val.minus(a.val).toNumber());
      const largest = categories[0].key;
      if (largest === "materials") matAlloc = matAlloc.plus(diff);
      else if (largest === "labor") labAlloc = labAlloc.plus(diff);
      else if (largest === "equipment") eqAlloc = eqAlloc.plus(diff);
      else if (largest === "additional") addAlloc = addAlloc.plus(diff);
    }
  }

  const materialsAllocated = matAlloc.toNumber();
  const laborAllocated = labAlloc.toNumber();
  const equipmentAllocated = eqAlloc.toNumber();
  const additionalAllocated = addAlloc.toNumber();

  const taxPercent = project?.financial_settings?.tax_percent || 0;

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm mb-8">
        <TableBody>
          <TableRow className="border-t border-border">
            <TableCell className="text-foreground font-medium px-3 py-2 text-xs">
              {t("project_tabs:materials")}
            </TableCell>
            <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
              {formatCurrency(materialsAllocated, project.currency)}
            </TableCell>
          </TableRow>
          <TableRow className="border-t border-border">
            <TableCell className="text-foreground font-medium px-3 py-2 text-xs">
              {t("project_tabs:labor")}
            </TableCell>
            <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
              {formatCurrency(laborAllocated, project.currency)}
            </TableCell>
          </TableRow>
          <TableRow className="border-t border-border">
            <TableCell className="text-foreground font-medium px-3 py-2 text-xs">
              {t("project_tabs:equipment")}
            </TableCell>
            <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
              {formatCurrency(equipmentAllocated, project.currency)}
            </TableCell>
          </TableRow>
          {additionalAllocated > 0 && (
            <TableRow className="border-t border-border">
              <TableCell className="text-foreground font-medium px-3 py-2 text-xs">
                {t("project_tabs:additional")}
              </TableCell>
              <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                {formatCurrency(additionalAllocated, project.currency)}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="bg-muted border-t border-border">
            <TableCell className="font-semibold uppercase text-foreground px-3 py-2 text-xs">
              {t("project_reports:subtotal")}
            </TableCell>
            <TableCell className="text-end font-bold tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
              {formatCurrency(financials.bidPrice, project.currency)}
            </TableCell>
          </TableRow>
          {financials.taxAmount > 0 && (
            <TableRow className="border-t border-border">
              <TableCell className="text-foreground px-3 py-2 text-xs">
                {t("project_detail:profit_pricing.taxesWithPercent", {
                  percent: taxPercent,
                })}
              </TableCell>
              <TableCell className="text-end tabular-nums text-foreground whitespace-nowrap px-3 py-2 text-xs">
                {formatCurrency(financials.taxAmount, project.currency)}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="bg-primary text-primary-foreground">
            <TableCell className="text-base font-bold uppercase px-3 py-2.5">
              {t("project_reports:totalProjectPrice")}
            </TableCell>
            <TableCell className="text-end text-base font-bold tabular-nums whitespace-nowrap px-3 py-2.5">
              {formatCurrency(financials.grandTotal, project.currency)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
