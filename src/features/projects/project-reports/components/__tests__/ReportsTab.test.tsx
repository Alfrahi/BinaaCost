import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReportsTab from "../ReportsTab";

// Mocks for child report components to inspect props passed down
const mockProjectCostReport = vi.fn();
vi.mock("../ProjectCostReport", () => ({
  ProjectCostReport: React.forwardRef((props: any, ref: any) => {
    mockProjectCostReport(props);
    return (
      <div ref={ref} data-testid="mock-project-cost-report">
        <span data-testid="pc-version-stamp">{props.versionStamp?.name ?? "live"}</span>
        <span data-testid="pc-material-count">{props.materials?.length ?? 0}</span>
      </div>
    );
  }),
}));

const mockClientProposalReport = vi.fn();
vi.mock("../ClientProposalReport", () => ({
  ClientProposalReport: React.forwardRef((props: any, ref: any) => {
    mockClientProposalReport(props);
    return (
      <div ref={ref} data-testid="mock-client-proposal-report">
        <span data-testid="cp-version-stamp">{props.versionStamp?.name ?? "live"}</span>
      </div>
    );
  }),
}));

const SelectContext = React.createContext<{ value?: string; onValueChange?: (val: string) => void }>({});

vi.mock("@/shared/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div data-testid="mock-select-root">{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({ children, id }: any) => <div id={id}>{children}</div>,
  SelectValue: ({ children, placeholder }: any) => <span>{children || placeholder}</span>,
  SelectContent: ({ children }: any) => {
    const ctx = React.useContext(SelectContext);
    return (
      <select
        data-testid="version-select-dropdown"
        value={ctx.value}
        onChange={(e) => ctx.onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    );
  },
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: any) =>
      typeof defaultValue === "string" ? defaultValue : key.split(":").pop() || key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "user1", email: "estimator@company.com" },
  }),
}));

vi.mock("@/features/settings/hooks/useReportSettings", () => ({
  useReportSettings: () => ({
    reportSettings: {
      company_name: "Test Corp",
      company_website: "https://test.com",
      company_email: "info@test.com",
      default_terms: "Standard Terms",
    },
  }),
}));

vi.mock("@/features/reports/hooks/usePdfExport", () => ({
  usePdfExport: () => ({
    generatePdf: vi.fn(),
    isGenerating: false,
  }),
}));

const liveMaterials = [
  { id: "mat-1", name: "Live Cement", quantity: 10, unit_price: 50, total_price: 500 },
];
const liveLabor = [
  { id: "lab-1", role: "Live Laborer", quantity: 2, hours: 8, hourly_rate: 25, total_price: 400 },
];
const liveEquipment = [
  { id: "eq-1", name: "Live Crane", cost_type: "rent", rate: 100, duration: 2, total_price: 200 },
];
const liveAdditional = [
  { id: "add-1", name: "Live Permits", cost: 100 },
];
const liveRisks = [
  { id: "risk-1", name: "Live Weather", probability: "low", impact: 1000, cost: 100 },
];

vi.mock("@/features/projects/project-costs/hooks/useProjectMaterials", () => ({
  useProjectMaterials: () => ({ data: liveMaterials }),
}));
vi.mock("@/features/projects/project-costs/hooks/useProjectLabor", () => ({
  useProjectLabor: () => ({ data: liveLabor }),
}));
vi.mock("@/features/projects/project-costs/hooks/useProjectEquipment", () => ({
  useProjectEquipment: () => ({ data: liveEquipment }),
}));
vi.mock("@/features/projects/project-costs/hooks/useProjectAdditionalCosts", () => ({
  useProjectAdditionalCosts: () => ({ data: liveAdditional }),
}));
vi.mock("@/features/projects/project-costs/hooks/useProjectRisks", () => ({
  useProjectRisks: () => ({ data: liveRisks }),
}));

const snapshotV1 = {
  project: {
    name: "Project V1 Snapshot",
    financial_settings: {
      overhead_percent: 5,
      markup_percent: 10,
      tax_percent: 0,
      contingency_percent: 2,
    },
  },
  materials: [
    { id: "snap-m1", name: "Historic Concrete", quantity: 100, unit_price: 20, total_price: 2000 },
  ],
  labor_items: [
    { id: "snap-l1", role: "Historic Mason", quantity: 1, hours: 10, hourly_rate: 30, total_price: 300 },
  ],
  equipment_items: [],
  additional_costs: [],
  risks: [],
  project_groups: [{ id: "grp-1", name: "Historic Substructure" }],
};

const snapshotV2 = {
  project: {
    name: "Project V2 Snapshot",
    financial_settings: {
      overhead_percent: 8,
      markup_percent: 15,
      tax_percent: 5,
      contingency_percent: 3,
    },
  },
  materials: [
    { id: "snap-m2", name: "Historic Steel", quantity: 5, unit_price: 1000, total_price: 5000 },
  ],
  labor_items: [],
  equipment_items: [],
  additional_costs: [],
  risks: [],
};

const mockFetchVersionSnapshot = vi.fn();
let mockVersions: any[] = [];

vi.mock("@/features/projects/project-versions/hooks/useProjectVersions", () => ({
  useProjectVersions: () => ({
    versions: mockVersions,
    fetchVersionSnapshot: mockFetchVersionSnapshot,
  }),
}));

const mockProject = {
  id: "proj-123",
  name: "Current Mega Project",
  currency: "USD",
  financial_settings: {
    overhead_percent: 15,
    markup_percent: 20,
    tax_percent: 10,
    contingency_percent: 5,
  },
  financial_settings_confirmed: true,
};

describe("ReportsTab - Milestone 4 (CRIT-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchVersionSnapshot.mockReset();
    mockFetchVersionSnapshot.mockResolvedValue(null);
    mockVersions = [
      {
        id: "ver-1",
        name: "v1.0 Baseline",
        created_at: "2026-01-15T12:00:00Z",
        is_final: true,
        data: snapshotV1,
      },
      {
        id: "ver-2",
        name: "v2.0 Scope Change",
        created_at: "2026-02-15T12:00:00Z",
        is_final: false,
        data: undefined, // fetched on demand
      },
    ];
  });

  it("renders live items and financials by default when 'Current Estimate (Live)' is selected", async () => {
    render(
      <ReportsTab
        project={mockProject}
        materialsTotal={500}
        laborTotal={400}
        equipmentTotal={200}
        additionalTotal={100}
        groups={[]}
        materialUnits={[]}
        periodUnits={[]}
        additionalCategories={[]}
        riskProbabilities={[]}
      />,
    );

    // Wait for lazy report component to render
    await waitFor(() => {
      expect(screen.getByTestId("mock-project-cost-report")).toBeDefined();
    });

    // Check that mockProjectCostReport was called with live data and NO versionStamp
    expect(mockProjectCostReport).toHaveBeenCalled();
    const lastCallProps = mockProjectCostReport.mock.calls[mockProjectCostReport.mock.calls.length - 1][0];
    expect(lastCallProps.versionStamp).toBeUndefined();
    expect(lastCallProps.materials).toEqual(liveMaterials);
    expect(lastCallProps.labor).toEqual(liveLabor);
    expect(lastCallProps.equipment).toEqual(liveEquipment);
    expect(lastCallProps.additional).toEqual(liveAdditional);
    expect(lastCallProps.risks).toEqual(liveRisks);

    // Live financial settings overhead was 15%
    const assumptionsStrip = screen.getByTestId("financial-assumptions");
    expect(assumptionsStrip.textContent).toContain("15%");
  });

  it("renders snapshot items, snapshot financials, and version stamp when historical version is selected", async () => {
    render(
      <ReportsTab
        project={mockProject}
        materialsTotal={500}
        laborTotal={400}
        equipmentTotal={200}
        additionalTotal={100}
        groups={[]}
        materialUnits={[]}
        periodUnits={[]}
        additionalCategories={[]}
        riskProbabilities={[]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-project-cost-report")).toBeDefined();
    });

    // Select v1.0 Baseline
    const select = screen.getAllByTestId("version-select-dropdown")[0];
    fireEvent.change(select, { target: { value: "ver-1" } });

    // Verify report received snapshot items and snapshot financial settings
    await waitFor(() => {
      const lastCallProps = mockProjectCostReport.mock.calls[mockProjectCostReport.mock.calls.length - 1][0];
      expect(lastCallProps.versionStamp).toBeDefined();
      expect(lastCallProps.versionStamp.name).toBe("v1.0 Baseline");
      expect(lastCallProps.materials).toEqual(snapshotV1.materials);
      expect(lastCallProps.labor).toEqual(snapshotV1.labor_items);
      expect(lastCallProps.groups).toEqual(snapshotV1.project_groups);
    });

    // Assumptions strip should reflect snapshot V1 overhead (5%), not live (15%)
    const assumptionsStrip = screen.getByTestId("financial-assumptions");
    expect(assumptionsStrip.textContent).toContain("5%");
  });

  it("fetches snapshot asynchronously via fetchVersionSnapshot if not present inline", async () => {
    mockFetchVersionSnapshot.mockResolvedValue(snapshotV2);

    render(
      <ReportsTab
        project={mockProject}
        materialsTotal={500}
        laborTotal={400}
        equipmentTotal={200}
        additionalTotal={100}
        groups={[]}
        materialUnits={[]}
        periodUnits={[]}
        additionalCategories={[]}
        riskProbabilities={[]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-project-cost-report")).toBeDefined();
    });

    // Select v2.0 Scope Change
    const select = screen.getAllByTestId("version-select-dropdown")[0];
    fireEvent.change(select, { target: { value: "ver-2" } });

    expect(mockFetchVersionSnapshot).toHaveBeenCalledWith("ver-2");

    await waitFor(() => {
      const lastCallProps = mockProjectCostReport.mock.calls[mockProjectCostReport.mock.calls.length - 1][0];
      expect(lastCallProps.versionStamp?.name).toBe("v2.0 Scope Change");
      expect(lastCallProps.materials).toEqual(snapshotV2.materials);
    });

    // Assumptions strip should reflect snapshot V2 overhead (8%)
    const assumptionsStrip = screen.getByTestId("financial-assumptions");
    expect(assumptionsStrip.textContent).toContain("8%");
  });

  it("switching from historical version back to 'Current Estimate (Live)' restores live data", async () => {
    render(
      <ReportsTab
        project={mockProject}
        materialsTotal={500}
        laborTotal={400}
        equipmentTotal={200}
        additionalTotal={100}
        groups={[]}
        materialUnits={[]}
        periodUnits={[]}
        additionalCategories={[]}
        riskProbabilities={[]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-project-cost-report")).toBeDefined();
    });

    const select = screen.getAllByTestId("version-select-dropdown")[0];

    // Select v1.0 Baseline
    fireEvent.change(select, { target: { value: "ver-1" } });

    await waitFor(() => {
      const props = mockProjectCostReport.mock.calls[mockProjectCostReport.mock.calls.length - 1][0];
      expect(props.versionStamp?.name).toBe("v1.0 Baseline");
    });

    // Switch back to "Current Estimate (Live)"
    fireEvent.change(select, { target: { value: "current" } });

    await waitFor(() => {
      const props = mockProjectCostReport.mock.calls[mockProjectCostReport.mock.calls.length - 1][0];
      expect(props.versionStamp).toBeUndefined();
      expect(props.materials).toEqual(liveMaterials);
    });

    // Assumptions strip should reflect live overhead (15%)
    const assumptionsStrip = screen.getByTestId("financial-assumptions");
    expect(assumptionsStrip.textContent).toContain("15%");
  });
});
