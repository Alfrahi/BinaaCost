import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSoftDeleteProject } from "../useSoftDeleteProject";

const mockInvalidateQueries = vi.fn();
const mockSetQueriesData = vi.fn();
const mockCancelQueries = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      setQueriesData: mockSetQueriesData,
      cancelQueries: mockCancelQueries,
      getQueryData: vi.fn().mockReturnValue({ version: 1 }),
    }),
    useMutation: (options: any) => ({
      mutateAsync: vi.fn(async (id: string) => {
        if (options.onMutate) await options.onMutate(id);
        if (options.mutationFn) await options.mutationFn(id);
        if (options.onSuccess) options.onSuccess(undefined, id);
      }),
      isPending: false,
    }),
  };
});

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: () => ({
      update: vi.fn().mockResolvedValue({ id: "p-1" }),
    }),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useSoftDeleteProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically removes deleted project from cached queries and invalidates project lists", async () => {
    const { result } = renderHook(() => useSoftDeleteProject());

    await act(async () => {
      await result.current.mutateAsync("p-1");
    });

    expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey: ["myProjects"] });
    expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey: ["sharedProjects"] });
    expect(mockSetQueriesData).toHaveBeenCalledWith(
      { queryKey: ["myProjects"] },
      expect.any(Function),
    );
    expect(mockSetQueriesData).toHaveBeenCalledWith(
      { queryKey: ["sharedProjects"] },
      expect.any(Function),
    );

    // Verify filter logic passed to setQueriesData
    const myProjectsUpdater = mockSetQueriesData.mock.calls.find(
      (c) => c[0].queryKey[0] === "myProjects",
    )[1];
    const initialMyProjects = {
      data: [{ id: "p-1", name: "Project 1" }, { id: "p-2", name: "Project 2" }],
      count: 2,
    };
    const updated = myProjectsUpdater(initialMyProjects);
    expect(updated.data).toEqual([{ id: "p-2", name: "Project 2" }]);
    expect(updated.count).toBe(1);

    // Invalidation checks
    const invalidatedKeys = mockInvalidateQueries.mock.calls.map(
      (c) => c[0].queryKey,
    );
    expect(invalidatedKeys).toContainEqual(["project"]);
    expect(invalidatedKeys).toContainEqual(["myProjects"]);
    expect(invalidatedKeys).toContainEqual(["sharedProjects"]);
    expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
  });
});
