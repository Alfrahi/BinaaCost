import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProjectMaterials } from "../useProjectMaterials";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

const mockSyncToLibrary = vi.fn();
let invalidateSpy: any;

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
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

vi.mock("@/features/projects/project-costs/hooks/useSyncToLibrary", () => ({
  useSyncToLibrary: () => ({
    syncToLibrary: mockSyncToLibrary,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useProjectMaterials - saveToLibrary guard", () => {
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
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  it("does not sync to library by default when saving project material", async () => {
    const { result } = renderHook(() => useProjectMaterials("proj-1"), { wrapper });

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

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
    });

    expect(mockSyncToLibrary).not.toHaveBeenCalled();
    
    const invalidatedKeys = invalidateSpy.mock.calls.map((c: any) => c[0].queryKey);
    // ensure it invalidated its own queries
    expect(invalidatedKeys).toContainEqual(["materials", "proj-1"]);
    // ensure it DID NOT invalidate library_materials
    expect(invalidatedKeys).not.toContainEqual(["library_materials"]);
  });

  it("does not sync to library when saveToLibrary is explicitly false", async () => {
    const { result } = renderHook(() => useProjectMaterials("proj-1"), { wrapper });

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

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
    });

    expect(mockSyncToLibrary).not.toHaveBeenCalled();
  });

  it("syncs to library when saveToLibrary is explicitly true", async () => {
    const { result } = renderHook(() => useProjectMaterials("proj-1"), { wrapper });

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

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
    });

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
    
    const invalidatedKeys = invalidateSpy.mock.calls.map((c: any) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(["library_materials"]);
  });
});
