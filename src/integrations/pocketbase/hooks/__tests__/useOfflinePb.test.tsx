import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useOfflinePb } from "../useOfflinePb";
import { offlineManager, isNetworkOrTransientError } from "@/shared/lib/offline";
import { executePbMutation } from "@/integrations/pocketbase/executor";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "u-test-123" },
  }),
}));

vi.mock("@/integrations/pocketbase/executor", () => ({
  executePbMutation: vi.fn(),
}));

describe("useOfflinePb", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    offlineManager.setQueryClient(queryClient);
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    offlineManager.reset();
    offlineManager.setIsOnline(true);
  });

  describe("isNetworkOrTransientError", () => {
    it("detects PocketBase status 0 as network error", () => {
      expect(isNetworkOrTransientError({ status: 0 })).toBe(true);
    });

    it("detects gateway error codes 502, 503, 504", () => {
      expect(isNetworkOrTransientError({ status: 502 })).toBe(true);
      expect(isNetworkOrTransientError({ status: 503 })).toBe(true);
      expect(isNetworkOrTransientError({ status: 504 })).toBe(true);
    });

    it("detects fetch failure and timeout messages", () => {
      expect(isNetworkOrTransientError(new TypeError("Failed to fetch"))).toBe(true);
      expect(isNetworkOrTransientError(new Error("NetworkError when attempting to fetch resource"))).toBe(true);
      expect(isNetworkOrTransientError(new Error("network request failed"))).toBe(true);
      expect(isNetworkOrTransientError(new Error("Connection timeout"))).toBe(true);
    });

    it("detects ECONNREFUSED and AbortError", () => {
      expect(isNetworkOrTransientError({ code: "ECONNREFUSED" })).toBe(true);
      expect(isNetworkOrTransientError({ name: "AbortError" })).toBe(true);
      expect(isNetworkOrTransientError({ isAbort: true })).toBe(true);
    });

    it("does NOT classify 400, 401, 403, 404, 409 as transient network errors", () => {
      expect(isNetworkOrTransientError({ status: 400 })).toBe(false);
      expect(isNetworkOrTransientError({ status: 401 })).toBe(false);
      expect(isNetworkOrTransientError({ status: 403 })).toBe(false);
      expect(isNetworkOrTransientError({ status: 404 })).toBe(false);
      expect(isNetworkOrTransientError({ status: 409 })).toBe(false);
    });
  });

  describe("useMutation transient network fallback (OFFL-04)", () => {
    it("executes online mutation successfully when connection is good", async () => {
      (executePbMutation as any).mockResolvedValue({ id: "rec1", name: "Steel" });

      const { result } = renderHook(() => useOfflinePb(), {
        wrapper: createWrapper(),
      });

      const { useMutation: useOfflineMutation } = result.current;
      const { result: mutationResult } = renderHook(
        () =>
          useOfflineMutation({
            queryKey: ["materials", "p1"],
            table: "materials",
            operation: "INSERT",
          }),
        { wrapper: createWrapper() },
      );

      let res: any;
      await act(async () => {
        res = await mutationResult.current.mutateAsync({ name: "Steel" });
      });

      expect(res).toEqual({ id: "rec1", name: "Steel" });
      expect(executePbMutation).toHaveBeenCalledTimes(1);
      expect(offlineManager.getQueueSize()).toBe(0);
      expect(offlineManager.getIsOnline()).toBe(true);
    });

    it("catches transient network error, sets offline, queues mutation, and returns payload without throwing", async () => {
      // Simulate network dropping during executePbMutation (e.g. status: 0)
      const networkError = { status: 0, message: "Failed to fetch" };
      (executePbMutation as any).mockRejectedValue(networkError);

      const addMutationSpy = vi.spyOn(offlineManager, "addMutation");

      const { result } = renderHook(() => useOfflinePb(), {
        wrapper: createWrapper(),
      });

      const { useMutation: useOfflineMutation } = result.current;
      const { result: mutationResult } = renderHook(
        () =>
          useOfflineMutation({
            queryKey: ["materials", "p1"],
            table: "materials",
            operation: "INSERT",
          }),
        { wrapper: createWrapper() },
      );

      let res: any;
      await act(async () => {
        res = await mutationResult.current.mutateAsync({ name: "Rebar", quantity: 100 });
      });

      // Returns optimistic payload
      expect(res).toEqual({ name: "Rebar", quantity: 100 });
      // OfflineManager marked offline
      expect(offlineManager.getIsOnline()).toBe(false);
      // Added to offline queue
      expect(addMutationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          table: "materials",
          type: "INSERT",
          payload: { name: "Rebar", quantity: 100 },
          userId: "u-test-123",
        }),
      );
    });

    it("does NOT queue non-network errors (e.g. 400 Bad Request) and rethrows", async () => {
      const validationError = { status: 400, message: "Field 'name' is required" };
      (executePbMutation as any).mockRejectedValue(validationError);

      const addMutationSpy = vi.spyOn(offlineManager, "addMutation");

      const { result } = renderHook(() => useOfflinePb(), {
        wrapper: createWrapper(),
      });

      const { useMutation: useOfflineMutation } = result.current;
      const { result: mutationResult } = renderHook(
        () =>
          useOfflineMutation({
            queryKey: ["materials", "p1"],
            table: "materials",
            operation: "INSERT",
          }),
        { wrapper: createWrapper() },
      );

      await expect(
        act(async () => {
          await mutationResult.current.mutateAsync({ quantity: 100 });
        }),
      ).rejects.toEqual(validationError);

      expect(addMutationSpy).not.toHaveBeenCalled();
      expect(offlineManager.getIsOnline()).toBe(true);
    });

    it("rethrows network error when disableOfflineQueue is true", async () => {
      const networkError = { status: 0, message: "Failed to fetch" };
      (executePbMutation as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useOfflinePb(), {
        wrapper: createWrapper(),
      });

      const { useMutation: useOfflineMutation } = result.current;
      const { result: mutationResult } = renderHook(
        () =>
          useOfflineMutation({
            queryKey: ["materials", "p1"],
            table: "materials",
            operation: "INSERT",
            disableOfflineQueue: true,
          }),
        { wrapper: createWrapper() },
      );

      await expect(
        act(async () => {
          await mutationResult.current.mutateAsync({ name: "DirectOnly" });
        }),
      ).rejects.toEqual(networkError);
    });
  });
});
