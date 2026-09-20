import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCostDatabaseItems } from "../useCostDatabaseItems";

const mockRawMutateAsync = vi.fn();
const mockRawMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useMutation: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: vi.fn(),
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "user-item-test-456" } }),
}));

vi.mock("@/integrations/pocketbase/hooks/useOfflinePb", () => ({
  useOfflinePb: () => ({
    useQuery: () => ({ data: { data: [], count: 0 }, isLoading: false }),
    useMutation: () => ({
      mutate: mockRawMutate,
      mutateAsync: mockRawMutateAsync,
      isPending: false,
    }),
  }),
}));

describe("useCostDatabaseItems - user_id injection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("injects logged in user_id into createItem.mutateAsync when omitted", async () => {
    mockRawMutateAsync.mockResolvedValueOnce({ id: "item-1" });
    const { result } = renderHook(() => useCostDatabaseItems("db-1"));

    await act(async () => {
      await result.current.createItem.mutateAsync({
        database_id: "db-1",
        csi_division: "03",
        csi_code: "03 30 00",
        description: "Cast-in-Place Concrete",
        unit: "m3",
        unit_price: 150,
      });
    });

    expect(mockRawMutateAsync).toHaveBeenCalledWith(
      {
        database_id: "db-1",
        csi_division: "03",
        csi_code: "03 30 00",
        description: "Cast-in-Place Concrete",
        unit: "m3",
        unit_price: 150,
        user_id: "user-item-test-456",
      },
      undefined,
    );
  });
});
