import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectVersionsTab from "../ProjectVersionsTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key.split(":").pop(),
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/utils/formatCurrency", () => ({
  useCurrencyFormatter: () => ({
    format: (amount: number, currency: string) =>
      `${currency} ${amount.toFixed(2)}`,
  }),
}));

const finalizeVersion = vi.fn().mockResolvedValue(undefined);
const deleteVersion = vi.fn().mockResolvedValue(undefined);
const createVersion = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useProjectVersions", () => ({
  useProjectVersions: () => ({
    versions: [
      {
        id: "v1",
        name: "Final Estimate",
        created_at: "2026-01-01T00:00:00Z",
        is_final: true,
        author_name: "Owner",
        data: {
          materials: [{ quantity: 10, unit_price: 5 }],
          labor_items: [],
          equipment_items: [],
          additional_costs: [],
        },
      },
      {
        id: "v2",
        name: "Draft Estimate",
        created_at: "2026-01-02T00:00:00Z",
        is_final: false,
        author_name: "Owner",
        data: {
          materials: [{ quantity: 20, unit_price: 5 }],
          labor_items: [],
          equipment_items: [],
          additional_costs: [],
        },
      },
    ],
    isLoadingVersions: false,
    fetchVersionSnapshot: vi.fn(),
    createVersion,
    isCreatingVersion: false,
    deleteVersion,
    isDeletingVersion: false,
    finalizeVersion,
    isFinalizingVersion: false,
  }),
}));

vi.mock("@/hooks/useApplyProjectVersion", () => ({
  useApplyProjectVersion: () => ({
    applyProjectVersion: vi.fn(),
    isApplyingVersion: false,
  }),
}));

vi.mock("@/features/project/useProjectData", () => ({
  useProjectData: () => ({
    project: { id: "p1", currency: "USD" },
    groups: [],
    materials: [],
    labor: [],
    equipment: [],
    additional: [],
    risks: [],
    isLoading: false,
  }),
}));

vi.mock("./VersionConflictResolver", () => ({
  default: () => <div>conflict-resolver</div>,
}));

const baseProps = {
  projectId: "p1",
  canEdit: true,
  materialUnits: [],
  periodUnits: [],
  additionalCategories: [],
  riskProbabilities: [],
};

describe("ProjectVersionsTab timeline", () => {
  it("renders all versions with names and cost summaries", () => {
    render(<ProjectVersionsTab {...baseProps} />);
    expect(screen.getByText("Final Estimate")).toBeTruthy();
    expect(screen.getByText("Draft Estimate")).toBeTruthy();
    // v1 direct total = 50, v2 = 100
    expect(screen.getByText("USD 50.00")).toBeTruthy();
    expect(screen.getByText("USD 100.00")).toBeTruthy();
  });

  it("shows a Finalized badge and disables restore for finalized versions", () => {
    render(<ProjectVersionsTab {...baseProps} />);
    // Finalized badge appears once (only v1 is final)
    expect(screen.getAllByText("finalizedBadge")).toHaveLength(1);
    // Restore button for the finalized version is disabled
    const restoreButtons = screen.getAllByLabelText(/restoreAction/);
    expect(restoreButtons).toHaveLength(2);
    expect((restoreButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((restoreButtons[1] as HTMLButtonElement).disabled).toBe(false);
  });

  it("opens the finalize confirmation for a non-finalized version", () => {
    render(<ProjectVersionsTab {...baseProps} />);
    const finalizeButtons = screen.getAllByLabelText(/^finalize /);
    // Only the non-finalized version has a finalize button
    expect(finalizeButtons).toHaveLength(1);
    fireEvent.click(finalizeButtons[0]);
    expect(screen.getByText("finalizeConfirmTitle")).toBeTruthy();
  });
});