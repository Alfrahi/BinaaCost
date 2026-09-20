import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FinancialInputs } from "../FinancialInputs";

const mockMutate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en", dir: () => "ltr" },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("../../hooks/useUpdateProjectFinancialSettings", () => ({
  useUpdateProjectFinancialSettings: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe("FinancialInputs (AUTH-ADV-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultSettings = {
    overhead_percent: 10,
    markup_percent: 15,
    tax_percent: 5,
    contingency_percent: 8,
    location_factor: 1.1,
  };

  it("enables inputs and allows saving when canEdit is true (owner / super_admin)", () => {
    render(
      <FinancialInputs
        projectId="proj-123"
        initialSettings={defaultSettings}
        settingsConfirmed={true}
        canEdit={true}
      />,
    );

    const overheadInput = screen.getByLabelText(/profit_pricing.overhead/i) as HTMLInputElement;
    expect(overheadInput.disabled).toBe(false);

    // Modify a value
    fireEvent.change(overheadInput, { target: { value: "12" } });
    expect(overheadInput.value).toBe("12");

    // Save button appears at bottom
    const saveButton = screen.getByRole("button", { name: "common:saveChanges" });
    expect(saveButton).toBeTruthy();
    fireEvent.click(saveButton);

    expect(mockMutate).toHaveBeenCalledWith({
      projectId: "proj-123",
      newSettings: expect.objectContaining({ overhead_percent: 12 }),
    });
  });

  it("locks inputs, renders read-only notice, and prevents saving when canEdit is false (editor / viewer)", () => {
    render(
      <FinancialInputs
        projectId="proj-123"
        initialSettings={defaultSettings}
        settingsConfirmed={true}
        canEdit={false}
      />,
    );

    // Read-only notice is displayed
    expect(
      screen.getByText("project_detail:profit_pricing.readOnlyNotice"),
    ).toBeTruthy();

    // Inputs are disabled
    const overheadInput = screen.getByLabelText(/profit_pricing.overhead/i) as HTMLInputElement;
    expect(overheadInput.disabled).toBe(true);

    const markupInput = screen.getByLabelText(/profit_pricing.markup/i) as HTMLInputElement;
    expect(markupInput.disabled).toBe(true);

    const taxesInput = screen.getByLabelText(/profit_pricing.taxes/i) as HTMLInputElement;
    expect(taxesInput.disabled).toBe(true);

    const contingencyInput = screen.getByLabelText(/profit_pricing.generalContingency/i) as HTMLInputElement;
    expect(contingencyInput.disabled).toBe(true);

    const locationInput = screen.getByLabelText(/profit_pricing.locationFactor/i) as HTMLInputElement;
    expect(locationInput.disabled).toBe(true);

    // No save button is rendered
    expect(screen.queryByRole("button", { name: "common:saveChanges" })).toBeNull();
  });
});
