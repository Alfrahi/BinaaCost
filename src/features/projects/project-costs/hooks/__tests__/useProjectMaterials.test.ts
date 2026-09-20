import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectMaterials } from "../useProjectMaterials";

const mockSyncToLibrary = vi.fn();
const mockAddItem = vi.fn();
const mockUpdateItem = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("@/integrations/pocketbase/hooks/useOfflinePb", () => ({
  useOfflinePb: () => ({
    useQuery: () => ({ data: [], isLoading: false, error: null }),
  }),
}));

vi.mock("@/features/projects/project-costs/hooks/useEntityCrud", () => ({
  useEntityCrud: () => ({
    addItem: mockAddItem,
    updateItem: mockUpdateItem,
    deleteItem: vi.fn(),
    bulkDeleteMutation: vi.fn(),
    bulkMoveMutation: vi.fn(),
    isAdding: false,
    isUpdating: false,
    isDeleting: false,
    isBulkDeleting: false,
    isBulkMoving: false,
  }),
}));

vi.mock("@/features/projects/project-costs/hooks/useSyncToLibrary", () => ({
  useSyncToLibrary: () => ({
    syncToLibrary: mockSyncToLibrary,
  }),
}));

describe("useProjectMaterials - saveToLibrary guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not sync to library by default when saving project material", async () => {
    const { result } = renderHook(() => useProjectMaterials("proj-1"));

    await act(async () => {
      await result.current.handleAddOrUpdate(
        {
          name: "Local Concrete",
          description: "Project specific mix",
          quantity: 10,
          unit: "m3",
          unit_price: 150,
          group_id: null,
        },
        "USD",
      );
    });

    expect(mockAddItem).toHaveBeenCalledTimes(1);
    expect(mockSyncToLibrary).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("does not sync to library when saveToLibrary is explicitly false", async () => {
    const { result } = renderHook(() => useProjectMaterials("proj-1"));

    await act(async () => {
      await result.current.handleAddOrUpdate(
        {
          name: "Special Timber",
          description: "One-off cut",
          quantity: 5,
          unit: "pcs",
          unit_price: 80,
          group_id: null,
        },
        "USD",
        undefined,
        false,
      );
    });

    expect(mockAddItem).toHaveBeenCalledTimes(1);
    expect(mockSyncToLibrary).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("syncs to library when saveToLibrary is explicitly true", async () => {
    const { result } = renderHook(() => useProjectMaterials("proj-1"));

    await act(async () => {
      await result.current.handleAddOrUpdate(
        {
          name: "Standard Rebar",
          description: "16mm deformed bar",
          quantity: 100,
          unit: "kg",
          unit_price: 2.5,
          group_id: null,
        },
        "USD",
        undefined,
        true,
      );
    });

    expect(mockAddItem).toHaveBeenCalledTimes(1);
    expect(mockSyncToLibrary).toHaveBeenCalledTimes(1);
    expect(mockSyncToLibrary).toHaveBeenCalledWith(
      {
        name: "Standard Rebar",
        description: "16mm deformed bar",
        unit: "kg",
        unit_price: 2.5,
      },
      "USD",
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["library_materials"],
    });
  });
});
