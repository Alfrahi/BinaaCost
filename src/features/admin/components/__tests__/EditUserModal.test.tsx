import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditUserModal from "../EditUserModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key.split(":").pop() || key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

describe("EditUserModal", () => {
  const mockUser = {
    id: "user-123",
    email: "john@example.com",
    first_name: "John",
    last_name: "Doe",
    role: "user",
    created_at: "2026-01-01T00:00:00Z",
  };

  it("populates initial user data and submits changes", async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();

    render(
      <EditUserModal
        user={mockUser}
        open={true}
        onOpenChange={handleOpenChange}
        onSave={handleSave}
        loading={false}
      />
    );

    const firstNameInput = document.getElementById("edit_first_name") as HTMLInputElement;
    const lastNameInput = document.getElementById("edit_last_name") as HTMLInputElement;
    const emailInput = document.getElementById("edit_email") as HTMLInputElement;

    expect(firstNameInput.value).toBe("John");
    expect(lastNameInput.value).toBe("Doe");
    expect(emailInput.value).toBe("john@example.com");

    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");

    const submitBtn = screen.getByRole("button", { name: /save/i });
    await user.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith({
      user_id: "user-123",
      email: "john@example.com",
      first_name: "Jane",
      last_name: "Doe",
      role: "user",
      password: undefined,
    });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("triggers password reset email callback", async () => {
    const user = userEvent.setup();
    const handleSendReset = vi.fn().mockResolvedValue(undefined);

    render(
      <EditUserModal
        user={mockUser}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        onSendPasswordReset={handleSendReset}
        loading={false}
      />
    );

    const resetEmailBtn = screen.getByRole("button", { name: /sendPasswordResetEmail/i });
    await user.click(resetEmailBtn);

    expect(handleSendReset).toHaveBeenCalledWith("john@example.com");
  });
});
