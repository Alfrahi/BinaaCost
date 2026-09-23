import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useEntityCrud } from "@/features/projects/project-costs/hooks/useEntityCrud";
import { useProjectRisks } from "@/features/projects/project-costs/hooks/useProjectRisks";
import { useUpdateProjectFinancialSettings } from "../useUpdateProjectFinancialSettings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Query Invalidation & Performance", () => {
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
    // Spy on invalidateQueries
    vi.spyOn(queryClient, "invalidateQueries");
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  describe("useEntityCrud invalidation", () => {
    it("invalidates projectCardSummary along with project and analytics", async () => {
      const { result } = renderHook(() =>
        useEntityCrud({
          table: "materials",
          projectId: "proj-abc",
        }),
        { wrapper }
      );

      await act(async () => {
        result.current.addItem({ name: "Wood" } as any);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      const invalidatedKeys = (queryClient.invalidateQueries as any).mock.calls.map(
        (c: any) => c[0].queryKey
      );

      expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
      expect(invalidatedKeys).toContainEqual(["project", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["materials", "proj-abc"]);
    });
  });

  describe("useProjectRisks invalidation", () => {
    it("invalidates projectCardSummary and analytics on risk mutations", async () => {
      const { result } = renderHook(() => useProjectRisks("proj-abc"), { wrapper });

      await act(async () => {
        await result.current.addRisk({ name: "Delay" } as any);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      const invalidatedKeys = (queryClient.invalidateQueries as any).mock.calls.map(
        (c: any) => c[0].queryKey
      );

      expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
      expect(invalidatedKeys).toContainEqual(["project", "proj-abc"]);
    });
  });

  describe("useUpdateProjectFinancialSettings invalidation", () => {
    it("invalidates projectCardSummary and analytics when financial settings change", async () => {
      const { result } = renderHook(() => useUpdateProjectFinancialSettings(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: "proj-abc",
          newSettings: {
            overhead_percent: 10,
            contingency_percent: 5,
            markup_percent: 15,
            tax_percent: 5,
          } as any,
          version: 1, // needed by our mock
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      const invalidatedKeys = (queryClient.invalidateQueries as any).mock.calls.map(
        (c: any) => c[0].queryKey
      );

      expect(invalidatedKeys).toContainEqual(["project", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
    });
  });
});
