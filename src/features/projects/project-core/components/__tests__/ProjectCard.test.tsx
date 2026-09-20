import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectCard } from "../ProjectCard";
import { useProjectCardSummary } from "@/features/projects/project-core/hooks/useProjectCardSummary";
import { useCloneProject } from "@/features/projects/project-core/hooks/useCloneProject";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key.split(":").pop(),
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

vi.mock("@/features/projects/project-core/hooks/useCloneProject", () => ({
  useCloneProject: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/shared/lib/formatCurrency", () => ({
  useCurrencyFormatter: () => ({
    format: (amount: number, currency: string) =>
      `${currency} ${amount.toFixed(2)}`,
  }),
}));

vi.mock("@/shared/hooks/useDateFormatter", () => ({
  useDateFormatter: () => ({
    formatDate: () => "Jan 1, 2026",
  }),
}));

vi.mock("@/features/projects/project-core/hooks/useProjectCardSummary", () => ({
  useProjectCardSummary: vi.fn(() => ({
    summary: { grandTotal: 1234.5, isFinalized: true },
    isLoadingSummary: false,
  })),
}));

const baseProps = {
  id: "p1",
  name: "Test Project",
  updatedAt: "2026-01-01T00:00:00Z",
  currency: "USD",
  financialSettings: null,
  onPrefetch: vi.fn(),
};

describe("ProjectCard", () => {
  it("renders name, grand total, and finalized status", () => {
    render(
      <MemoryRouter>
        <ProjectCard {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Test Project")).toBeTruthy();
    expect(screen.getByText("USD 1234.50")).toBeTruthy();
    expect(screen.getByText("finalized")).toBeTruthy();
  });

  it("shows a shared badge and role for shared projects", () => {
    render(
      <MemoryRouter>
        <ProjectCard {...baseProps} isShared sharedRole="editor" />
      </MemoryRouter>,
    );
    expect(screen.getByText("editor_display")).toBeTruthy();
  });

  it("does not show the finalized badge when not finalized", () => {
    vi.mocked(useProjectCardSummary).mockReturnValueOnce({
      summary: { grandTotal: 100, isFinalized: false },
      isLoadingSummary: false,
    });
    render(
      <MemoryRouter>
        <ProjectCard {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("finalized")).toBeNull();
  });

  it("calls duplicate mutation when duplicate button is clicked", () => {
    const mutate = vi.fn();
    vi.mocked(useCloneProject).mockReturnValueOnce({
      mutate,
      isPending: false,
    } as any);

    render(
      <MemoryRouter>
        <ProjectCard {...baseProps} />
      </MemoryRouter>,
    );

    const duplicateBtn = screen.getByRole("button", {
      name: /duplicateProject/i,
    });
    fireEvent.click(duplicateBtn);

    expect(mutate).toHaveBeenCalledWith({ projectId: "p1" });
  });
});