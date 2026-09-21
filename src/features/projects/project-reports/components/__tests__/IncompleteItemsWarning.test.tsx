import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IncompleteItemsWarning } from "../FinancialAssumptions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === "project_reports:incompleteItemsWarning") {
        return `This estimate contains ${opts?.count} items with missing or zero cost data.`;
      }
      return key.split(":").pop() || key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("IncompleteItemsWarning", () => {
  it("renders when count > 0", () => {
    render(<IncompleteItemsWarning count={3} />);

    expect(screen.getByTestId("incomplete-items-warning")).toBeDefined();
    expect(
      screen.getByText("This estimate contains 3 items with missing or zero cost data."),
    ).toBeDefined();
  });

  it("does not render when count is 0", () => {
    const { container } = render(<IncompleteItemsWarning count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("dismisses when dismiss button is clicked", () => {
    render(<IncompleteItemsWarning count={2} />);
    expect(screen.getByTestId("incomplete-items-warning")).toBeDefined();

    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId("incomplete-items-warning")).toBeNull();
  });
});
