import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEntityCrud } from "@/features/projects/project-costs/hooks/useEntityCrud";
import { useProjectRisks } from "@/features/projects/project-costs/hooks/useProjectRisks";
import { useUpdateProjectFinancialSettings } from "../useUpdateProjectFinancialSettings";

const mockInvalidateQueries = vi.fn();
let lastEntityMutationOptions: any = null;
let lastRiskMutationOptions: any = null;

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
    useMutation: (options: any) => {
      return {
        mutate: vi.fn(),
        mutateAsync: vi.fn(async (vars) => {
          if (options.mutationFn) await options.mutationFn(vars);
          if (options.onSuccess) options.onSuccess(undefined, vars);
        }),
        isPending: false,
      };
    },
  };
});

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: () => ({
      getFullList: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "proj-1" }),
    }),
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

vi.mock("@/integrations/pocketbase/hooks/useOfflinePb", () => ({
  useOfflinePb: () => ({
    useQuery: () => ({ data: [], isLoading: false }),
    useMutation: (options: any) => {
      if (options.table === "risks") {
        lastRiskMutationOptions = options;
      } else {
        lastEntityMutationOptions = options;
      }
      return {
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      };
    },
  }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    lastEntityMutationOptions = null;
    lastRiskMutationOptions = null;
  });

  describe("useEntityCrud invalidation", () => {
    it("invalidates projectCardSummary along with project and analytics", () => {
      renderHook(() =>
        useEntityCrud({
          table: "materials",
          projectId: "proj-abc",
        }),
      );

      expect(lastEntityMutationOptions).not.toBeNull();
      lastEntityMutationOptions.onSuccess();

      const invalidatedKeys = mockInvalidateQueries.mock.calls.map(
        (c) => c[0].queryKey,
      );

      expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
      expect(invalidatedKeys).toContainEqual(["project", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["materials", "proj-abc"]);
    });
  });

  describe("useProjectRisks invalidation", () => {
    it("invalidates projectCardSummary and analytics on risk mutations", () => {
      renderHook(() => useProjectRisks("proj-abc"));

      expect(lastRiskMutationOptions).not.toBeNull();
      lastRiskMutationOptions.onSuccess();

      const invalidatedKeys = mockInvalidateQueries.mock.calls.map(
        (c) => c[0].queryKey,
      );

      expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
      expect(invalidatedKeys).toContainEqual(["project", "proj-abc"]);
    });
  });

  describe("useUpdateProjectFinancialSettings invalidation", () => {
    it("invalidates projectCardSummary and analytics when financial settings change", async () => {
      const { result } = renderHook(() => useUpdateProjectFinancialSettings());

      await act(async () => {
        await result.current.mutateAsync({
          projectId: "proj-abc",
          newSettings: {
            overhead_percent: 10,
            contingency_percent: 5,
            markup_percent: 15,
            tax_percent: 5,
          } as any,
        });
      });

      const invalidatedKeys = mockInvalidateQueries.mock.calls.map(
        (c) => c[0].queryKey,
      );

      expect(invalidatedKeys).toContainEqual(["project", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["projectCardSummary", "proj-abc"]);
      expect(invalidatedKeys).toContainEqual(["analytics_projects_data"]);
    });
  });
});
