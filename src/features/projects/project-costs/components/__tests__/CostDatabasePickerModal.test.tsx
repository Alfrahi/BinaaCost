import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CostDatabasePickerModal } from "@/features/projects/project-costs/components/CostDatabasePickerModal";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: any) => {
        if (options?.name) return `Imported "${options.name}"`;
        return key.split(".").pop();
      },
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

const mockDatabases = [
  { id: "db-1", name: "MasterFormat 2024", currency: "USD" },
  { id: "db-2", name: "Regional DB", currency: "SAR" },
];

const mockItems = [
  {
    id: "item-1",
    database_id: "db-1",
    csi_division: "03 - Concrete",
    csi_code: "03 30 00",
    description: "Cast-in-Place Concrete",
    unit: "m3",
    unit_price: 150,
  },
  {
    id: "item-2",
    database_id: "db-1",
    csi_division: "04 - Masonry",
    csi_code: "04 20 00",
    description: "Concrete Masonry Units",
    unit: "sq m",
    unit_price: 45,
  },
];

vi.mock("@/features/cost-library/hooks/useCostDatabases", () => ({
  useCostDatabases: () => ({
    databasesQuery: {
      data: mockDatabases,
      isLoading: false,
    },
  }),
}));

vi.mock("@/features/cost-library/hooks/useCostDatabaseItems", () => ({
  useCostDatabaseItems: (_dbId?: string, _page = 0, _pageSize = 10, search = "") => {
    const filtered = search
      ? mockItems.filter(
          (i) =>
            i.description.toLowerCase().includes(search.toLowerCase()) ||
            i.csi_code.includes(search),
        )
      : mockItems;
    return {
      itemsQuery: {
        data: {
          data: filtered,
          count: filtered.length,
        },
        isLoading: false,
      },
    };
  },
}));

vi.mock("@/shared/hooks/useCurrencyConverter", () => ({
  useCurrencyConverter: () => ({
    convert: (amount: number, from: string, to: string) => {
      if (from === to) return amount;
      if (from === "USD" && to === "SAR") return amount * 3.75;
      if (from === "SAR" && to === "USD") return amount / 3.75;
      return amount;
    },
  }),
}));

vi.mock("@/shared/lib/formatCurrency", () => ({
  useCurrencyFormatter: () => ({
    format: (val: number, cur: string) => `${cur} ${val.toFixed(2)}`,
  }),
}));

describe("CostDatabasePickerModal", () => {
  const onImportMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button with correct label", () => {
    render(
      <CostDatabasePickerModal
        projectCurrency="USD"
        onImport={onImportMock}
      />,
    );
    expect(screen.getByText("pickFromDatabase")).toBeDefined();
  });

  it("opens modal dialog on button click and displays items", () => {
    render(
      <CostDatabasePickerModal
        projectCurrency="USD"
        onImport={onImportMock}
      />,
    );

    fireEvent.click(screen.getByText("pickFromDatabase"));

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Cast-in-Place Concrete")).toBeDefined();
    expect(screen.getByText("Concrete Masonry Units")).toBeDefined();
  });

  it("selects an item and displays configuration section", async () => {
    render(
      <CostDatabasePickerModal
        projectCurrency="USD"
        groups={[{ id: "grp-1", name: "Substructure" }]}
        onImport={onImportMock}
      />,
    );

    fireEvent.click(screen.getByText("pickFromDatabase"));

    const itemRow = screen.getByText("Cast-in-Place Concrete");
    fireEvent.click(itemRow);

    expect(screen.getByText("itemConfig")).toBeDefined();
    expect(screen.getByDisplayValue("1")).toBeDefined(); // default quantity = 1
  });

  it("imports the selected item with quantity scaling", async () => {
    render(
      <CostDatabasePickerModal
        projectCurrency="USD"
        onImport={onImportMock}
      />,
    );

    fireEvent.click(screen.getByText("pickFromDatabase"));
    fireEvent.click(screen.getByText("Cast-in-Place Concrete"));

    // Change quantity to 10
    const qtyInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(qtyInput, { target: { value: "10" } });

    const importButton = screen.getByText("importItem");
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(onImportMock).toHaveBeenCalledTimes(1);
    });

    expect(onImportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Cast-in-Place Concrete",
        unit_price: 150,
      }),
      10,
      undefined,
    );
  });
});
