import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientProposalFinancialSummary } from "../ClientProposalFinancialSummary";
import { calculateProjectFinancials } from "@/shared/logic/financials";

describe("ClientProposalFinancialSummary", () => {
  const mockFormat = (val: number, cur: string) => `${cur} ${val.toFixed(2)}`;
  const mockT = (key: string) => {
    if (key === "project_tabs:materials") return "Materials";
    if (key === "project_tabs:labor") return "Labor";
    if (key === "project_tabs:equipment") return "Equipment";
    if (key === "project_tabs:additional") return "Additional Costs";
    if (key === "project_reports:subtotal") return "Subtotal";
    if (key === "project_reports:totalProjectPrice") return "Total Project Price";
    return key;
  };

  it("does not render phantom Additional Costs row when additionalTotal is 0", () => {
    // Construct totals where proportional allocation generates rounding differences
    const totals = {
      materialsTotal: 100.33,
      laborTotal: 200.33,
      equipmentTotal: 300.33,
      additionalTotal: 0,
    };
    const settings = {
      overhead_percent: 10,
      contingency_percent: 5,
      markup_percent: 17,
      tax_percent: 0,
    };
    const financials = calculateProjectFinancials(totals, settings);

    render(
      <ClientProposalFinancialSummary
        financials={financials}
        project={{ currency: "USD", financial_settings: settings }}
        formatCurrency={mockFormat}
        t={mockT}
      />,
    );

    // Verify Additional Costs is NOT in the document
    expect(screen.queryByText("Additional Costs")).toBeNull();

    // Verify Materials, Labor, Equipment, Subtotal are present
    expect(screen.getByText("Materials")).toBeDefined();
    expect(screen.getByText("Labor")).toBeDefined();
    expect(screen.getByText("Equipment")).toBeDefined();
  });

  it("renders Additional Costs row when additionalTotal > 0", () => {
    const totals = {
      materialsTotal: 100,
      laborTotal: 200,
      equipmentTotal: 100,
      additionalTotal: 50,
    };
    const settings = {
      overhead_percent: 10,
      contingency_percent: 5,
      markup_percent: 15,
      tax_percent: 0,
    };
    const financials = calculateProjectFinancials(totals, settings);

    render(
      <ClientProposalFinancialSummary
        financials={financials}
        project={{ currency: "USD", financial_settings: settings }}
        formatCurrency={mockFormat}
        t={mockT}
      />,
    );

    expect(screen.getByText("Additional Costs")).toBeDefined();
  });
});
