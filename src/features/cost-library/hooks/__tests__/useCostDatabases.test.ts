import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCostDatabases } from "../useCostDatabases";

const mockRawMutateAsync = vi.fn();
const mockRawMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: vi.fn(),
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "user-test-789" } }),
}));

vi.mock("@/integrations/pocketbase/hooks/useOfflinePb", () => ({
  useOfflinePb: () => ({
    useMutation: () => ({
      mutate: mockRawMutate,
      mutateAsync: mockRawMutateAsync,
      isPending: false,
    }),
  }),
}));

describe("useCostDatabases - user_id injection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects logged in user_id into createDatabase.mutateAsync when omitted", async () => {
    mockRawMutateAsync.mockResolvedValueOnce({ id: "db-1" });
    const { result } = renderHook(() => useCostDatabases());

    await act(async () => {
      await result.current.createDatabase.mutateAsync({
        name: "Commercial Database",
        currency: "USD",
        is_public: false,
      });
    });

    expect(mockRawMutateAsync).toHaveBeenCalledWith(
      {
        name: "Commercial Database",
        currency: "USD",
        is_public: false,
        user_id: "user-test-789",
      },
      undefined,
    );
  });

  it("preserves explicit user_id if already provided", async () => {
    mockRawMutateAsync.mockResolvedValueOnce({ id: "db-2" });
    const { result } = renderHook(() => useCostDatabases());

    await act(async () => {
      await result.current.createDatabase.mutateAsync({
        name: "Admin Database",
        currency: "EUR",
        is_public: true,
        user_id: "custom-user-id",
      });
    });

    expect(mockRawMutateAsync).toHaveBeenCalledWith(
      {
        name: "Admin Database",
        currency: "EUR",
        is_public: true,
        user_id: "custom-user-id",
      },
      undefined,
    );
  });

  it("injects logged in user_id into createDatabase.mutate", () => {
    const { result } = renderHook(() => useCostDatabases());

    act(() => {
      result.current.createDatabase.mutate({
        name: "Sync Database",
        currency: "USD",
      });
    });

    expect(mockRawMutate).toHaveBeenCalledWith(
      {
        name: "Sync Database",
        currency: "USD",
        user_id: "user-test-789",
      },
      undefined,
    );
  });
});
