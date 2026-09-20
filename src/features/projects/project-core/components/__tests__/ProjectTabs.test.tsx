import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProjectTabs from "../ProjectTabs";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key.split(":").pop(),
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/features/projects/project-core/hooks/useProjectData", () => ({
  useProjectData: () => ({
    project: {
      id: "p1",
      name: "Test Project",
      currency: "USD",
      financial_settings: null,
      financial_settings_confirmed: true,
    },
    sizeUnits: [],
    projectTypes: [],
    groups: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/features/projects/project-core/hooks/useProjectTotals", () => ({
  useProjectTotals: () => ({
    totals: {
      materialsTotal: 0,
      laborTotal: 0,
      equipmentTotal: 0,
      additionalTotal: 0,
    },
    isLoading: false,
    materials: [],
    labor: [],
    equipment: [],
    additional: [],
  }),
}));

vi.mock("@/features/projects/project-costs/hooks/useProjectRisks", () => ({
  useProjectRisks: () => ({
    risks: [],
    isLoading: false,
  }),
}));

vi.mock("@/features/projects/project-core/hooks/useProjectComments", () => ({
  useProjectComments: () => ({
    itemComments: [],
    commentsDrawerOpen: false,
    setCommentsDrawerOpen: vi.fn(),
    selectedCommentItem: null,
    selectedCommentItemType: null,
    handleOpenComments: vi.fn(),
    handleAddComment: vi.fn(),
    handleUpdateComment: vi.fn(),
    handleDeleteComment: vi.fn(),
    currentUserId: "user1",
    isAnyCommentMutationLoading: false,
  }),
}));

vi.mock("@/features/projects/project-core/hooks/useProjectSettingsOptions", () => ({
  useProjectSettingsOptions: () => ({
    materialUnits: [],
    isLoadingMaterialUnits: false,
    rentalOptions: [],
    isLoadingRentalOptions: false,
    periodUnits: [],
    isLoadingPeriodUnits: false,
    additionalCategories: [],
    isLoadingAdditionalCategories: false,
    riskProbabilities: [],
    isLoadingRiskProbabilities: false,
    durationUnits: [],
  }),
}));

vi.mock("@/features/projects/project-analytics/hooks/useScenarioManager", () => ({
  useScenarioManager: () => ({
    scenarios: [],
  }),
}));

vi.mock("../OverviewTab", () => ({
  default: () => {
    throw new Error("Crash inside OverviewTab");
  },
}));

describe("ProjectTabs ErrorBoundary Isolation", () => {
  it("catches rendering error in a child tab and displays localized fallback without crashing navigation", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    render(
      <MemoryRouter initialEntries={["/projects/p1?tab=overview"]}>
        <ProjectTabs projectId="p1" canEdit={true} />
      </MemoryRouter>,
    );

    // Tab bar should still be visible and interactive
    expect(screen.getByText("overview")).toBeTruthy();
    expect(screen.getByText("costs")).toBeTruthy();

    // ErrorDisplay should be rendered inside the tab content
    expect(await screen.findByText("boundaryTitle")).toBeTruthy();
    expect(screen.getByText("Crash inside OverviewTab")).toBeTruthy();
    expect(screen.getByText("tryAgain")).toBeTruthy();

    consoleSpy.mockRestore();
  });
});
