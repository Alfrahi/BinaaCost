import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpdateProject } from "../useUpdateProject";

const mockNavigate = vi.fn();
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
  useParams: () => ({ id: "proj-123" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "user-abc", email: "test@example.com" },
  }),
}));

const mockInitialData = {
  id: "proj-123",
  name: "Old Name",
  description: "Old Desc",
  type: "Commercial",
  size: 500,
  size_unit: "sqm",
  location: "Riyadh",
  client_requirements: "Specs",
  duration_days: 100,
  duration_unit: "Day",
  currency: "USD",
  user_id: "owner-999",
  updated_at: "2026-09-20 12:00:00.000Z",
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: mockInitialData,
    isLoading: false,
    error: null,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: vi.fn(),
  },
}));

vi.mock("@/integrations/pocketbase/hooks/useOfflinePb", () => ({
  useOfflinePb: () => ({
    useMutation: () => ({
      mutate: mockMutate,
      isPending: false,
      error: null,
    }),
  }),
}));

vi.mock("../useCurrencyConversionDialog", () => ({
  useCurrencyConversionDialog: () => ({
    showCurrencyConversionDialog: false,
    setShowCurrencyConversionDialog: vi.fn(),
    pendingNewCurrency: null,
    originalCurrency: null,
    isConverting: false,
    openConversionDialog: vi.fn(),
    handleConfirmConversion: vi.fn(),
    handleCancelConversion: vi.fn(),
  }),
}));

describe("useUpdateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits updated project details without user_id or updated in the payload", async () => {
    const { result } = renderHook(() => useUpdateProject());

    await act(async () => {
      await result.current.handleSubmit({
        name: "New Complex Name",
        description: "New Description",
        type: "Residential",
        size: 1000,
        size_unit: "sqm",
        location: "Jeddah",
        client_requirements: "New specs",
        duration_days: 60,
        duration_unit: "Day",
        currency: "USD",
      });
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const mutationPayload = mockMutate.mock.calls[0][0];

    // id and form fields should be present
    expect(mutationPayload.id).toBe("proj-123");
    expect(mutationPayload.name).toBe("New Complex Name");
    expect(mutationPayload.description).toBe("New Description");
    expect(mutationPayload.type).toBe("Residential");
    expect(mutationPayload.size).toBe(1000);
    expect(mutationPayload.location).toBe("Jeddah");

    // user_id and updated MUST NOT be in the mutation payload (SEC-001 immutability & concurrency)
    expect(mutationPayload.user_id).toBeUndefined();
    expect(mutationPayload.updated).toBeUndefined();
  });
});
