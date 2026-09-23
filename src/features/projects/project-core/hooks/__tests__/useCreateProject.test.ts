import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCreateProject } from "../useCreateProject";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

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

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "builder@example.com" },
  }),
}));

vi.mock("@/features/settings/hooks/useCompanyFinancialDefaults", () => ({
  useCompanyFinancialDefaults: () => ({
    defaults: {
      default_currency: "SAR",
      overhead_percent: 10,
      markup_percent: 15,
      tax_percent: 15,
      contingency_percent: 5,
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useCreateProject", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  it("submits project creation and navigates to new project", async () => {
    const { result } = renderHook(() => useCreateProject(), { wrapper });

    await act(async () => {
      await result.current.handleSubmit({
        name: "Olympic Stadium",
        description: "Main sports arena",
        type: "Sports",
        size: 50000,
        size_unit: "sqm",
        location: "Riyadh",
        client_requirements: "FIFA standards",
        duration_days: 730,
        duration_unit: "Day",
        currency: "SAR",
      });
    });

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("project_form:success_created");
    });
    expect(mockNavigate).toHaveBeenCalled();
  });
});
