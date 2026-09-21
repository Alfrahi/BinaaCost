import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientProposalReport } from "../ClientProposalReport";
import { calculateProjectFinancials } from "@/shared/logic/financials";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "durations:days") return "days";
      if (key === "project_reports:projectSummary") return "Project Summary";
      if (key === "project_reports:termsAndConditions") return "Terms and Conditions";
      if (key === "project_reports:noClientRequirements") return "No client requirements specified";
      return key.split(":").pop();
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("ClientProposalReport", () => {
  const dummyFinancials = calculateProjectFinancials(
    {
      materialsTotal: 1000,
      laborTotal: 500,
      equipmentTotal: 200,
      additionalTotal: 100,
    },
    {
      overhead_percent: 10,
      contingency_percent: 5,
      markup_percent: 15,
      tax_percent: 0,
    },
  );

  const companyInfo = {
    name: "Acme Contracting",
    website: "https://acme.example.com",
    logoUrl: "",
    email: "contact@acme.example.com",
  };

  it("renders multiline client requirements with whitespace-pre-line and break-words classes", () => {
    const multilineRequirements = [
      "1. Turnkey civil, structural, MEP, and high-end architectural finishing in strict compliance with the NFPA safety regulations.",
      "2. High-performance double-glazed Low-E structural curtain wall façade with automated solar-shading louvers.",
      "3. Primary-variable central chilled water cooling plant (2x 450 TR water-cooled chillers) integrated with smart Building Management System (BMS).",
    ].join("\n");

    const project = {
      name: "Tower Alpha",
      description: "Commercial tower project",
      type: "Commercial",
      location: "Riyadh",
      duration_days: 360,
      duration_unit: "DAYS",
      currency: "SAR",
      client_requirements: multilineRequirements,
      financial_settings: {
        overhead_percent: 10,
        contingency_percent: 5,
        markup_percent: 15,
        tax_percent: 0,
      },
    };

    render(
      <ClientProposalReport
        project={project}
        financials={dummyFinancials}
        companyInfo={companyInfo}
        terms="Standard terms"
        preparedBy="Estimator"
        clientName="Client Corp"
      />,
    );

    const summaryHeading = screen.getByText("Project Summary");
    expect(summaryHeading).toBeDefined();

    // The paragraph directly after Project Summary heading
    const reqParagraph = summaryHeading.nextElementSibling as HTMLElement;
    expect(reqParagraph).toBeDefined();
    expect(reqParagraph.tagName).toBe("P");
    expect(reqParagraph.className).toContain("whitespace-pre-line");
    expect(reqParagraph.className).toContain("break-words");
    expect(reqParagraph.textContent).toContain("1. Turnkey civil");
    expect(reqParagraph.textContent).toContain("2. High-performance");
    expect(reqParagraph.textContent).toContain("3. Primary-variable");
  });

  it("renders multiline terms and conditions with whitespace-pre-line and break-words classes", () => {
    const multilineTerms = [
      "1. Payment terms: 30% deposit, 40% structural, 30% handover.",
      "2. Timeline estimated subject to permit approvals.",
      "3. Scope adjustments billed at actual cost plus fee.",
    ].join("\n");

    const project = {
      name: "Villa Beta",
      description: "Luxury residential villa",
      type: "Residential",
      location: "Jeddah",
      duration_days: 180,
      duration_unit: "DAYS",
      currency: "SAR",
      client_requirements: "Standard requirements",
      financial_settings: {
        overhead_percent: 10,
        contingency_percent: 5,
        markup_percent: 15,
        tax_percent: 0,
      },
    };

    render(
      <ClientProposalReport
        project={project}
        financials={dummyFinancials}
        companyInfo={companyInfo}
        terms={multilineTerms}
        preparedBy="Estimator"
        clientName="Private Client"
      />,
    );

    const termsHeading = screen.getByText("Terms and Conditions");
    expect(termsHeading).toBeDefined();

    // The div directly after Terms and Conditions heading
    const termsDiv = termsHeading.nextElementSibling as HTMLElement;
    expect(termsDiv).toBeDefined();
    expect(termsDiv.className).toContain("whitespace-pre-line");
    expect(termsDiv.className).toContain("break-words");
    expect(termsDiv.textContent).toContain("1. Payment terms");
    expect(termsDiv.textContent).toContain("2. Timeline estimated");
    expect(termsDiv.textContent).toContain("3. Scope adjustments");
  });
});
