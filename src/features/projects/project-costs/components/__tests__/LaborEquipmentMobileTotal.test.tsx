import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LaborTable } from "../LaborTable";
import { EquipmentTable } from "../EquipmentTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/shared/hooks/useMobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: any) =>
      opts?.defaultValue || k.split(":").pop()?.split(".").pop() || k,
    i18n: { language: "en", dir: () => "ltr" },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "u-1" } }),
}));

vi.mock("@/features/cost-library/hooks/useAssemblies", () => ({
  useAssemblies: () => ({ allAssemblies: [], isLoading: false }),
  useAssemblyItems: () => ({ itemsQuery: { data: [], isLoading: false } }),
}));

vi.mock("@/features/cost-library/hooks/useCostDatabases", () => ({
  useCostDatabases: () => ({
    databasesQuery: { data: [], isLoading: false },
    databases: [],
    isLoading: false,
  }),
}));

const mockLaborItem = {
  id: "l-1",
  user_id: "u-1",
  project_id: "p-1",
  worker_type: "Master Carpenter",
  number_of_workers: 2,
  daily_rate: 100,
  total_days: 5,
  total_cost: 999999, // Intentionally stale total_cost
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const mockEquipmentItem = {
  id: "eq-1",
  user_id: "u-1",
  project_id: "p-1",
  name: "Excavator",
  rental_or_purchase: "Rental",
  quantity: 1,
  cost_per_period: 500,
  period_unit: "day",
  usage_duration: 2,
  maintenance_cost: 50,
  fuel_cost: 50,
  total_cost: 888888, // Intentionally stale total_cost
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

vi.mock("@/features/projects/project-costs/hooks/useProjectLabor", () => ({
  useProjectLabor: () => ({
    data: [mockLaborItem],
    handleAddOrUpdate: vi.fn(),
    handleDuplicate: vi.fn(),
    handleDelete: vi.fn(),
    handleUpdateField: vi.fn(),
    handleBulkDelete: vi.fn(),
    handleBulkMove: vi.fn(),
    isAdding: false,
    isUpdating: false,
    isDeleting: false,
    isBulkDeleting: false,
    isBulkMoving: false,
  }),
}));

vi.mock("@/features/projects/project-costs/hooks/useProjectEquipment", () => ({
  useProjectEquipment: () => ({
    data: [mockEquipmentItem],
    handleAddOrUpdate: vi.fn(),
    handleDuplicate: vi.fn(),
    handleDelete: vi.fn(),
    handleUpdateField: vi.fn(),
    handleBulkDelete: vi.fn(),
    handleBulkMove: vi.fn(),
    isAdding: false,
    isUpdating: false,
    isDeleting: false,
    isBulkDeleting: false,
    isBulkMoving: false,
  }),
}));

vi.mock("@/shared/lib/formatCurrency", () => ({
  useCurrencyFormatter: () => ({
    format: (val: number, cur: string) => `${cur} ${Number(val).toFixed(2)}`,
  }),
}));

describe("Mobile row total calculation", () => {
  const queryClient = new QueryClient();

  it("LaborTable derives mobile card total from source fields instead of trusting stale total_cost", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LaborTable
          projectId="p-1"
          canEdit={true}
          currency="USD"
          onOpenComments={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // 2 workers * $100/day * 5 days = $1,000.00
    // Must NOT display stale $999999.00
    expect(screen.getByText("USD 1000.00")).toBeDefined();
    expect(screen.queryByText("USD 999999.00")).toBeNull();
  });

  it("EquipmentTable derives mobile card total from source fields instead of trusting stale total_cost", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EquipmentTable
          projectId="p-1"
          canEdit={true}
          currency="USD"
          onOpenComments={vi.fn()}
          rentalOptions={[{ value: "Rental", label: "Rental" }]}
          isLoadingRentalOptions={false}
          periodUnits={[{ value: "day", label: "Day" }]}
          isLoadingPeriodUnits={false}
        />
      </QueryClientProvider>,
    );

    // 1 qty * $500/day * 2 days + $50 maint + $50 fuel = $1,100.00
    // Must NOT display stale $888888.00
    expect(screen.getByText("USD 1100.00")).toBeDefined();
    expect(screen.queryByText("USD 888888.00")).toBeNull();
  });
});
