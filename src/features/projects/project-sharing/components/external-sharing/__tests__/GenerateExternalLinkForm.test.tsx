import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GenerateExternalLinkForm } from "../GenerateExternalLinkForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key.split(":").pop(),
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("GenerateExternalLinkForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows the one-time link with a prominent copy button and shown-once warning after generation", async () => {
    const onGenerate = vi.fn().mockResolvedValue("token-abc");
    render(<GenerateExternalLinkForm isGenerating={false} onGenerate={onGenerate} />);

    const passwordInput = screen.getByLabelText("share.external.password") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "supersecret" } });

    const submitButton = screen.getByRole("button", { name: /generateLink/ });
    fireEvent.click(submitButton);

    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1));

    // Shown-once warning is rendered.
    expect(screen.getByTestId("shown-once-warning")).toBeTruthy();
    expect(screen.getByText("share.external.shownOnceWarning")).toBeTruthy();

    // The generated link is displayed with a labeled copy button.
    const link = screen.getByTestId("generated-link");
    expect(link.textContent).toContain("/public-share/token-abc");

    const copyButton = screen.getByRole("button", { name: /copyLink/ });
    expect(copyButton).toBeTruthy();
  });

  it("copies the link to the clipboard when the copy button is clicked", async () => {
    const onGenerate = vi.fn().mockResolvedValue("token-abc");
    render(<GenerateExternalLinkForm isGenerating={false} onGenerate={onGenerate} />);

    const passwordInput = screen.getByLabelText("share.external.password") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "supersecret" } });
    fireEvent.click(screen.getByRole("button", { name: /generateLink/ }));

    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /copyLink/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/public-share/token-abc"),
    );
  });

  it("does not render the link or warning before generation", () => {
    render(
      <GenerateExternalLinkForm isGenerating={false} onGenerate={vi.fn()} />,
    );
    expect(screen.queryByTestId("shown-once-warning")).toBeNull();
    expect(screen.queryByTestId("generated-link")).toBeNull();
  });
});