import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssemblyImport } from "../useAssemblyImport";
import type { AssemblyItem } from "@/features/cost-library";

const mockAddMaterial = vi.fn();
const mockAddLabor = vi.fn();
const mockAddEquipment = vi.fn();
const mockAddAdditional = vi.fn();

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (k: string) => k,
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useMutation: ({ mutationFn }: any) => ({
    mutateAsync: mutationFn,
    isPending: false,
  }),
}));

vi.mock("@/features/projects/project-core/hooks/useProjectData", () => ({
  useProjectData: () => ({
    project: { id: "p1", name: "Test Project", currency: "EUR" },
    isLoading: false,
  }),
}));

vi.mock("@/shared/hooks/useCurrencyConverter", () => ({
  useCurrencyConverter: () => ({
    convert: (amount: number, from: string, to: string) => {
      if (from === "USD" && to === "EUR") return amount * 0.9;
      return amount;
    },
  }),
}));

vi.mock("@/features/projects/project-costs/hooks/useProjectMaterials", () => ({
  useProjectMaterials: () => ({ handleAddOrUpdate: mockAddMaterial }),
}));

vi.mock("@/features/projects/project-costs/hooks/useProjectLabor", () => ({
  useProjectLabor: () => ({ handleAddOrUpdate: mockAddLabor }),
}));

vi.mock("@/features/projects/project-costs/hooks/useProjectEquipment", () => ({
  useProjectEquipment: () => ({ handleAddOrUpdate: mockAddEquipment }),
}));

vi.mock("@/features/projects/project-costs/hooks/useProjectAdditionalCosts", () => ({
  useProjectAdditionalCosts: () => ({ handleAddOrUpdate: mockAddAdditional }),
}));

describe("useAssemblyImport - parametric scale and currency conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scales quantities and converts currency with scaleFactor", async () => {
    const { result } = renderHook(() => useAssemblyImport("p1"));

    const items: AssemblyItem[] = [
      {
        id: "item-1",
        assembly_id: "as-1",
        user_id: "u1",
        item_type: "material",
        description: "Drywall 1/2 inch",
        quantity: 4,
        unit: "sheet",
        unit_price: 100, // $100 USD -> 90 EUR
        details: null,
        created_at: "",
        updated_at: "",
      },
      {
        id: "item-2",
        assembly_id: "as-1",
        user_id: "u1",
        item_type: "labor",
        description: "Carpenter",
        quantity: 2, // 2 workers
        unit: null,
        unit_price: 200, // $200 USD -> 180 EUR
        details: { total_days: 3 }, // 3 days * scaleFactor 2.5 = 7.5 days
        created_at: "",
        updated_at: "",
      },
    ];

    await act(async () => {
      await result.current.importAssemblyItems({
        assemblyItems: items,
        scaleFactor: 2.5,
      });
    });

    expect(mockAddMaterial).toHaveBeenCalledWith(
      {
        name: "Drywall 1/2 inch",
        description: undefined,
        quantity: 10, // 4 * 2.5
        unit: "sheet",
        unit_price: 90, // $100 * 0.9
        group_id: undefined,
      },
      "EUR",
    );

    expect(mockAddLabor).toHaveBeenCalledWith(
      {
        worker_type: "Carpenter",
        number_of_workers: 2,
        daily_rate: 180, // $200 * 0.9
        total_days: 7.5, // 3 * 2.5
        description: undefined,
        group_id: undefined,
      },
      "EUR",
    );
  });

  it("handles rental and purchased equipment correctly with scaleFactor", async () => {
    const { result } = renderHook(() => useAssemblyImport("p1"));

    const items: AssemblyItem[] = [
      {
        id: "item-eq-rental",
        assembly_id: "as-1",
        user_id: "u1",
        item_type: "equipment",
        description: "Backhoe Loader",
        quantity: 1,
        unit: "Day",
        unit_price: 300, // $300 USD -> 270 EUR
        details: {
          rental_or_purchase: "Rental",
          usage_duration: 4, // scaled: 4 * 2 = 8
          maintenance_cost: 50,
          fuel_cost: 20,
        },
        created_at: "",
        updated_at: "",
      },
      {
        id: "item-eq-purchase",
        assembly_id: "as-1",
        user_id: "u1",
        item_type: "equipment",
        description: "Concrete Mixer",
        quantity: 1,
        unit: "Day",
        unit_price: 2000, // $2000 USD -> 1800 EUR
        details: {
          rental_or_purchase: "Purchase",
          usage_duration: 10, // Must NOT scale or be multiplied; forced to 1 for purchase
          maintenance_cost: 0,
          fuel_cost: 0,
        },
        created_at: "",
        updated_at: "",
      },
    ];

    await act(async () => {
      await result.current.importAssemblyItems({
        assemblyItems: items,
        scaleFactor: 2,
      });
    });

    // Rental equipment scales duration
    expect(mockAddEquipment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Backhoe Loader",
        rental_or_purchase: "Rental",
        cost_per_period: 270,
        usage_duration: 8,
      }),
      "EUR",
    );

    // Purchased equipment forces usage_duration to 1 regardless of scaleFactor
    expect(mockAddEquipment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Concrete Mixer",
        rental_or_purchase: "Purchase",
        cost_per_period: 1800,
        usage_duration: 1,
      }),
      "EUR",
    );
  });
});
