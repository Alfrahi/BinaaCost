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

  const materialsAllocated = new Decimal(financials.materialsTotal).times(markupRatio).toDecimalPlaces(2).toNumber();
  const laborAllocated = new Decimal(financials.laborTotal).times(markupRatio).toDecimalPlaces(2).toNumber();
  const equipmentAllocated = new Decimal(financials.equipmentTotal).times(markupRatio).toDecimalPlaces(2).toNumber();
  // Allocate remaining cents to additional so line items reconcile exactly to bidPrice
  const additionalAllocated = new Decimal(financials.bidPrice)
    .minus(materialsAllocated)
    .minus(laborAllocated)
    .minus(equipmentAllocated)
    .toDecimalPlaces(2)
    .toNumber();

  const taxPercent = project?.financial_settings?.tax_percent || 0;

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm mb-8">
        <TableBody>
          <TableRow className="border-t border-border">
            <TableCell className="text-foreground font-medium">
              {t("project_tabs:materials")}
            </TableCell>
            <TableCell className="text-end tabular-nums text-foreground">
              {formatCurrency(materialsAllocated, project.currency)}
            </TableCell>
          </TableRow>
          <TableRow className="border-t border-border">
            <TableCell className="text-foreground font-medium">
              {t("project_tabs:labor")}
            </TableCell>
            <TableCell className="text-end tabular-nums text-foreground">
              {formatCurrency(laborAllocated, project.currency)}
            </TableCell>
          </TableRow>
          <TableRow className="border-t border-border">
            <TableCell className="text-foreground font-medium">
              {t("project_tabs:equipment")}
            </TableCell>
            <TableCell className="text-end tabular-nums text-foreground">
              {formatCurrency(equipmentAllocated, project.currency)}
            </TableCell>
          </TableRow>
          {additionalAllocated > 0 && (
            <TableRow className="border-t border-border">
              <TableCell className="text-foreground font-medium">
                {t("project_tabs:additional")}
              </TableCell>
              <TableCell className="text-end tabular-nums text-foreground">
                {formatCurrency(additionalAllocated, project.currency)}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="bg-muted border-t border-border">
            <TableCell className="font-semibold uppercase text-foreground">
              {t("project_reports:subtotal")}
            </TableCell>
            <TableCell className="text-end font-bold tabular-nums text-foreground">
              {formatCurrency(financials.bidPrice, project.currency)}
            </TableCell>
          </TableRow>
          {financials.taxAmount > 0 && (
            <TableRow className="border-t border-border">
              <TableCell className="text-foreground">
                {t("project_detail:profit_pricing.taxesWithPercent", {
                  percent: taxPercent,
                })}
              </TableCell>
              <TableCell className="text-end tabular-nums text-foreground">
                {formatCurrency(financials.taxAmount, project.currency)}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="bg-primary text-primary-foreground">
            <TableCell className="text-lg font-bold uppercase">
              {t("project_reports:totalProjectPrice")}
            </TableCell>
            <TableCell className="text-end text-lg font-bold tabular-nums">
              {formatCurrency(financials.grandTotal, project.currency)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
