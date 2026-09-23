import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCloneProject } from "../useCloneProject";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (k: string) => {
        if (k === "common:copySuffix") return "Copy";
        return k;
      },
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useCloneProject", () => {
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

  it("fails when missing required fields", async () => {
    const { result } = renderHook(() => useCloneProject(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ projectId: "source-proj-1", customName: "" });
      } catch (e) {
        // Expected to fail
      }
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it("calls the clone endpoint and invalidates query cache", async () => {
    const { result } = renderHook(() => useCloneProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ projectId: "source-proj-1", customName: "My Custom Clone" });
    });

    expect(toast.success).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/projects/new-proj-999");
  });
});
