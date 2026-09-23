import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "../components/Login";
import { AuthProvider } from "../hooks/useAuth";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/tests/setup";
import { http, HttpResponse } from "msw";

const queryClient = new QueryClient();

describe("Login / Signup Form", () => {
  it("allows switching to signup and typing into email and password", async () => {
    // Setup MSW to mock the app_settings fetch for public_registration_enabled
    server.use(
      http.get("*/api/collections/app_settings/records", () => {
        return HttpResponse.json({
          page: 1,
          perPage: 1,
          totalItems: 1,
          totalPages: 1,
          items: [{
            id: "rec-reg",
            key: "public_registration_enabled",
            value: { enabled: true },
          }]
        });
      })
    );

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for signup link
    const signUpLink = await screen.findByText("signUpLink");
    await user.click(signUpLink);

    // Check if email input can be typed into
    const emailInput = document.getElementById("signup-email") as HTMLInputElement;
    const passwordInput = document.getElementById("signup-password") as HTMLInputElement;
    const confirmInput = document.getElementById("signup-confirm") as HTMLInputElement;

    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(confirmInput).toBeTruthy();

    await user.type(emailInput, "test@example.com");
    expect(emailInput.value).toBe("test@example.com");

    await user.type(passwordInput, "secret123");
    expect(passwordInput.value).toBe("secret123");

    await user.type(confirmInput, "secret123");
    expect(confirmInput.value).toBe("secret123");

    // Switch back to sign in
    const signInLink = await screen.findByText("alreadyHaveAccountLink");
    await user.click(signInLink);

    const loginEmailInput = document.getElementById("email") as HTMLInputElement;
    const loginPasswordInput = document.getElementById("password") as HTMLInputElement;

    expect(loginEmailInput).toBeTruthy();
    expect(loginPasswordInput).toBeTruthy();

    await user.type(loginEmailInput, "user@example.com");
    expect(loginEmailInput.value).toBe("user@example.com");
  });
});
