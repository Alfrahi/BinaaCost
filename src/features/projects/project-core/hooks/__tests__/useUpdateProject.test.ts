import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpdateProject } from "../useUpdateProject";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockInvalidateQueries = vi.fn();
let lastMutationOptions: any = null;
let lastCurrencyDialogProps: any = null;

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
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: vi.fn(),
  },
}));

vi.mock("@/integrations/pocketbase/hooks/useOfflinePb", () => ({
  useOfflinePb: () => ({
    useMutation: (options: any) => {
      lastMutationOptions = options;
      return {
        mutate: mockMutate,
        isPending: false,
        error: null,
      };
    },
  }),
}));

vi.mock("../useCurrencyConversionDialog", () => ({
  useCurrencyConversionDialog: (props: any) => {
    lastCurrencyDialogProps = props;
    return {
      showCurrencyConversionDialog: false,
      setShowCurrencyConversionDialog: vi.fn(),
      pendingNewCurrency: null,
      originalCurrency: null,
      isConverting: false,
      openConversionDialog: vi.fn(),
      handleConfirmConversion: vi.fn(),
      handleCancelConversion: vi.fn(),
    };
  },
}));

describe("useUpdateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastMutationOptions = null;
    lastCurrencyDialogProps = null;
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

  it("does not invalidate child collections on regular metadata update, but invalidates project and card summary", () => {
    renderHook(() => useUpdateProject());

    expect(lastMutationOptions).not.toBeNull();
    lastMutationOptions.onSuccess();

    const invalidatedKeys = mockInvalidateQueries.mock.calls.map(
      (c) => c[0].queryKey,
    );

    // Verified invalidations:
    expect(invalidatedKeys).toContainEqual(["project", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["myProjects"]);
    expect(invalidatedKeys).toContainEqual(["sharedProjects"]);
    expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);

    // Must NOT invalidate child collections on metadata update
    expect(invalidatedKeys).not.toContainEqual(["materials", "proj-123"]);
    expect(invalidatedKeys).not.toContainEqual(["labor_items", "proj-123"]);
    expect(invalidatedKeys).not.toContainEqual(["equipment_items", "proj-123"]);
    expect(invalidatedKeys).not.toContainEqual(["additional_costs", "proj-123"]);
    expect(invalidatedKeys).not.toContainEqual(["risks", "proj-123"]);
    expect(invalidatedKeys).not.toContainEqual(["project_groups", "proj-123"]);

    expect(mockNavigate).toHaveBeenCalledWith("/projects/proj-123");
  });

  it("invalidates all child collections when currency conversion is confirmed", async () => {
    renderHook(() => useUpdateProject());

    expect(lastCurrencyDialogProps).not.toBeNull();
    await lastCurrencyDialogProps.onConfirmConversion("SAR", { currency: "SAR" });

    const invalidatedKeys = mockInvalidateQueries.mock.calls.map(
      (c) => c[0].queryKey,
    );

    expect(invalidatedKeys).toContainEqual(["project", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["materials", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["labor_items", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["equipment_items", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["additional_costs", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["risks", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-123"]);
    expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
  });
});
