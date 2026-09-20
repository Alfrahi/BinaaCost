import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssemblyImport } from "../useAssemblyImport";
import { AssemblyItem } from "@/features/cost-library/assemblies/types/assemblies";

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
});
