import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSoftDeleteProject } from "../useSoftDeleteProject";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

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

  it("fails to delete when version is missing and shows error toast", async () => {
    // Setup initial cache state WITHOUT 'version' to trigger schema rejection mock
    queryClient.setQueryData(["project", "p-1"], { id: "p-1" });
    
    const { result } = renderHook(() => useSoftDeleteProject(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("p-1");
      } catch (e) {
        // Expected to throw
      }
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it("optimistically removes deleted project from cached queries and invalidates project lists", async () => {
    // Setup initial cache state WITH 'version' to succeed
    queryClient.setQueryData(["project", "p-1"], { id: "p-1", version: 1 });
    queryClient.setQueryData(["myProjects"], {
      data: [{ id: "p-1", name: "Project 1" }, { id: "p-2", name: "Project 2" }],
      count: 2,
    });
    
    const { result } = renderHook(() => useSoftDeleteProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("p-1");
    });

    expect(toast.success).toHaveBeenCalledWith("project_detail:successDeleted");

    const myProjects = queryClient.getQueryData<any>(["myProjects"]);
    expect(myProjects.data).toEqual([{ id: "p-2", name: "Project 2" }]);
    expect(myProjects.count).toBe(1);
  });
});
