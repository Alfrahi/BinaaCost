import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCloneProject } from "../useCloneProject";
import { pb } from "@/integrations/pocketbase/client";

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockToastSuccess = vi.fn();

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

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
  useMutation: ({ mutationFn, onSuccess }: any) => ({
    mutate: async (vars: any) => {
      try {
        const res = await mutationFn(vars);
        onSuccess(res);
        return res;
      } catch (e) {
        throw e;
      }
    },
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: vi.fn(),
  },
}));

vi.mock("@/integrations/pocketbase/client", () => {
  const collections: Record<string, any> = {};

  return {
    pb: {
      collection: (name: string) => {
        if (!collections[name]) {
          collections[name] = {
            getOne: vi.fn(),
            getFullList: vi.fn().mockResolvedValue([]),
            create: vi.fn((data: any) =>
              Promise.resolve({ id: `mock-${name}-${Date.now()}`, ...data }),
            ),
          };
        }
        return collections[name];
      },
    },
  };
});

describe("useCloneProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clones project record and copies child items with mapped group IDs", async () => {
    const sourceProject = {
      id: "source-proj-1",
      name: "Villa Construction",
      description: "2-story villa",
      type: "Residential",
      size: 350,
      size_unit: "sqm",
      location: "Riyadh",
      client_requirements: "Fast-track",
      duration_days: 120,
      duration_unit: "days",
      currency: "SAR",
      financial_settings: { overhead_percent: 10, markup_percent: 15 },
      financial_settings_confirmed: true,
      user_id: "other-user",
    };

    const sourceGroups = [
      { id: "g1", name: "Foundation", color: "#3b82f6", sort_order: 1 },
    ];
    const sourceMaterials = [
      { id: "m1", name: "Cement", quantity: 100, unit: "bag", unit_price: 15, group_id: "g1" },
    ];
    const sourceLabor = [
      { id: "l1", worker_type: "Mason", number_of_workers: 4, daily_rate: 150, total_days: 10, group_id: "g1" },
    ];
    const sourceEquipment = [
      { id: "e1", name: "Excavator", quantity: 1, cost_per_period: 500, period_unit: "day", usage_duration: 5, rental_or_purchase: "rental", group_id: null },
    ];
    const sourceAdditional = [
      { id: "a1", category: "Permits", amount: 2000, group_id: null },
    ];
    const sourceRisks = [
      { id: "r1", name: "Weather delay", impact_amount: 5000, probability: "medium" },
    ];

    const projCol = pb.collection("projects") as any;
    projCol.getOne.mockResolvedValue(sourceProject);
    projCol.create.mockResolvedValue({ id: "new-proj-999", name: "Villa Construction (Copy)" });

    (pb.collection("project_groups") as any).getFullList.mockResolvedValue(sourceGroups);
    (pb.collection("project_groups") as any).create.mockResolvedValue({ id: "new-g-1", name: "Foundation" });

    (pb.collection("materials") as any).getFullList.mockResolvedValue(sourceMaterials);
    (pb.collection("labor_items") as any).getFullList.mockResolvedValue(sourceLabor);
    (pb.collection("equipment_items") as any).getFullList.mockResolvedValue(sourceEquipment);
    (pb.collection("additional_costs") as any).getFullList.mockResolvedValue(sourceAdditional);
    (pb.collection("risks") as any).getFullList.mockResolvedValue(sourceRisks);

    const { result } = renderHook(() => useCloneProject());

    await act(async () => {
      await result.current.mutate({ projectId: "source-proj-1" });
    });

    // Check project creation
    expect(projCol.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Villa Construction (Copy)",
        currency: "SAR",
        location: "Riyadh",
        user_id: "user-123",
      }),
    );

    // Check group creation
    expect(pb.collection("project_groups").create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Foundation",
        project_id: "new-proj-999",
        user_id: "user-123",
      }),
    );

    // Check line item mapped group
    expect(pb.collection("materials").create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Cement",
        project_id: "new-proj-999",
        group_id: "new-g-1",
        user_id: "user-123",
      }),
    );

    expect(pb.collection("labor_items").create).toHaveBeenCalledWith(
      expect.objectContaining({
        worker_type: "Mason",
        project_id: "new-proj-999",
        group_id: "new-g-1",
        user_id: "user-123",
      }),
    );

    expect(pb.collection("equipment_items").create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Excavator",
        project_id: "new-proj-999",
        group_id: null,
      }),
    );

    expect(pb.collection("risks").create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Weather delay",
        project_id: "new-proj-999",
      }),
    );

    // Navigation and query invalidation
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["myProjects"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(mockNavigate).toHaveBeenCalledWith("/projects/new-proj-999");
  });
});
