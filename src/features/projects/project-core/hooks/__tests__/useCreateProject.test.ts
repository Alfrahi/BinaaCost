import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCreateProject } from "../useCreateProject";

const mockNavigate = vi.fn();
let capturedMutationConfig: any = null;
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

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
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

vi.mock("@/integrations/pocketbase/hooks/useOfflinePb", () => ({
  useOfflinePb: () => ({
    useMutation: (config: any) => {
      capturedMutationConfig = config;
      return {
        mutate: mockMutate,
        isPending: false,
        error: null,
      };
    },
  }),
}));

describe("useCreateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMutationConfig = null;
  });

  it("submits project creation with an optimistic UUID id in the payload for offline cascade", async () => {
    const { result } = renderHook(() => useCreateProject());

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

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const payload = mockMutate.mock.calls[0][0];

    // Verify optimistic ID is assigned upfront
    expect(payload.id).toBeDefined();
    expect(typeof payload.id).toBe("string");
    expect(payload.id.length).toBeGreaterThan(15); // Standard UUID

    expect(payload.name).toBe("Olympic Stadium");
    expect(payload.user_id).toBe("user-123");
    expect(payload.financial_settings).toEqual({
      overhead_percent: 10,
      markup_percent: 15,
      tax_percent: 15,
      contingency_percent: 5,
    });
  });

  it("optimisticUpdater adds the new project to cache preserving variables.id", () => {
    renderHook(() => useCreateProject());
    expect(capturedMutationConfig).toBeTruthy();

    const oldCache = {
      data: [{ id: "p0", name: "Existing Project", description: null, created_at: "2026-01-01", user_id: "u1" }],
      count: 1,
    };

    const newProjectPayload = {
      id: "opt-uuid-999",
      name: "New Arena",
      user_id: "user-123",
    };

    const updated = capturedMutationConfig.optimisticUpdater(oldCache, newProjectPayload, "INSERT");
    expect(updated.count).toBe(2);
    expect(updated.data).toHaveLength(2);
    expect(updated.data[1].id).toBe("opt-uuid-999");
    expect(updated.data[1].name).toBe("New Arena");
  });

  it("navigates directly to /projects/:id on success when id is returned", () => {
    renderHook(() => useCreateProject());
    expect(capturedMutationConfig).toBeTruthy();

    capturedMutationConfig.onSuccess({ id: "opt-uuid-999" });
    expect(mockNavigate).toHaveBeenCalledWith("/projects/opt-uuid-999");
  });
});
