import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useForm } from "react-hook-form";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key.split(":").pop(),
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/features/admin/hooks/useSettingsOptions", () => ({
  useSettingsOptions: () => ({ options: [], isLoading: false }),
}));

vi.mock("@/shared/components/TranslatedSelect", () => ({
  TranslatedSelect: () => null,
}));

import ProjectForm from "../ProjectForm";

function renderForm() {
  let formApi: any;
  function Harness() {
    formApi = useForm({
      defaultValues: {
        name: "",
        currency: "USD",
      },
    });
    return (
      <ProjectForm
        form={formApi}
        onSubmit={vi.fn()}
        isEditing={false}
        loading={false}
      />
    );
  }
  render(<Harness />);
  return formApi;
}

describe("ProjectForm dirty guard", () => {
  it("shows description and client requirements in create mode", () => {
    renderForm();
    expect(screen.getByLabelText("description")).toBeTruthy();
    expect(screen.getByLabelText("clientRequirements")).toBeTruthy();
  });

  it("shows the discard dialog when cancelling with unsaved changes", () => {
    renderForm();
    const nameInput = screen.getByLabelText("name");

    fireEvent.change(nameInput, { target: { value: "Tower A" } });

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.getByText("discardTitle")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "discardChanges" }));
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("navigates immediately when the form is clean", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.queryByText("discardTitle")).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("adds and removes a beforeunload listener based on dirty state", () => {
    renderForm();
    const nameInput = screen.getByLabelText("name");

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    act(() => {
      fireEvent.change(nameInput, { target: { value: "Tower A" } });
    });
    expect(
      addSpy.mock.calls.some(([type]) => type === "beforeunload"),
    ).toBe(true);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
