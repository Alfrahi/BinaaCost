import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Table, TableBody } from "@/shared/components/ui/table";
import { EquipmentRow } from "../EquipmentRow";
import { EquipmentForm } from "../EquipmentForm";
import { EquipmentItem } from "../../types/items";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === "common:notApplicable") return "N/A";
      if (key === "columns.purchaseCost") return "Purchase Cost";
      if (key === "columns.costPerPeriod") return "Cost per Period";
      if (key === "columns.periodUnit") return "Period Unit";
      if (key === "columns.usageDuration") return "Usage Duration";
      if (key === "columns.maintenance") return "Maintenance Cost";
      if (key === "columns.fuel") return "Fuel Cost";
      if (key === "columns.name") return "Name";
      if (key === "columns.type") return "Type";
      if (key === "columns.quantity") return "Quantity";
      if (key === "columns.rentalPurchase") return "Rental/Purchase";
      if (opts?.defaultValue) return opts.defaultValue;
      return key.split(":").pop()?.split(".").pop() || key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: () => ({
      getFullList: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@/shared/hooks/useCurrencyConverter", () => ({
  useCurrencyConverter: () => ({
    convert: (val: number) => val,
    getMissingRates: () => [],
  }),
}));

const rentalOptions = [
  { value: "Rental", label: "Rental" },
  { value: "Purchase", label: "Purchase" },
];

const periodUnits = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
];

describe("EquipmentRow", () => {
  const rentalItem: EquipmentItem = {
    id: "eq-1",
    user_id: "user-1",
    project_id: "p1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    name: "Excavator",
    type: "Heavy",
    rental_or_purchase: "Rental",
    quantity: 2,
    cost_per_period: 150,
    period_unit: "day",
    usage_duration: 10,
    maintenance_cost: 50,
    fuel_cost: 30,
    total_cost: 3080,
  };

  const purchaseItem: EquipmentItem = {
    id: "eq-2",
    user_id: "user-1",
    project_id: "p1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    name: "Generator",
    type: "Power",
    rental_or_purchase: "Purchase",
    quantity: 1,
    cost_per_period: 5000,
    period_unit: "day",
    usage_duration: 1,
    maintenance_cost: 100,
    fuel_cost: 40,
    total_cost: 5140,
  };

  it("renders all 12 cells in exact column order for rental equipment", () => {
    const onComment = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onDuplicate = vi.fn();
    const onUpdateField = vi.fn();
    const onToggle = vi.fn();

    const { container } = render(
      <Table>
        <TableBody>
          <EquipmentRow
            item={rentalItem}
            currency="USD"
            isOwner={true}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onComment={onComment}
            onUpdateField={onUpdateField}
            selected={false}
            onToggle={onToggle}
            rentalOptions={rentalOptions}
            periodUnits={periodUnits}
          />
        </TableBody>
      </Table>,
    );

    const cells = container.querySelectorAll("td");
    // Checkbox + Name + Type + Rental/Purchase + Quantity + Cost per period + Period Unit + Usage Duration + Maintenance + Fuel + Total + Actions
    expect(cells.length).toBe(12);

    // Cell 0: Checkbox
    expect(cells[0].querySelector('button[role="checkbox"]')).toBeTruthy();
    // Cell 1: Name
    expect(cells[1].textContent).toContain("Excavator");
    // Cell 2: Type
    expect(cells[2].textContent).toContain("Heavy");
    // Cell 3: Rental/Purchase
    expect(cells[3].textContent).toContain("Rental");
    // Cell 4: Quantity
    expect(cells[4].textContent).toContain("2");
    // Cell 5: Cost per period
    expect(cells[5].textContent).toContain("150");
    // Cell 6: Period Unit
    expect(cells[6].textContent).toBe("Day");
    // Cell 7: Usage Duration
    expect(cells[7].textContent).toContain("10");
    // Cell 8: Maintenance Cost
    expect(cells[8].textContent).toContain("50");
    // Cell 9: Fuel Cost
    expect(cells[9].textContent).toContain("30");
    // Cell 10: Estimated Total (2 * 150 * 10 + 50 + 30 = 3080)
    expect(cells[10].textContent).toContain("3,080");
    // Cell 11: Actions (Action buttons are here in the last cell, NOT under maintenance cost!)
    expect(cells[11].querySelectorAll("button").length).toBe(4);
  });

  it("renders N/A for rental-related cells when equipment is purchased", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <EquipmentRow
            item={purchaseItem}
            currency="USD"
            isOwner={true}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDuplicate={vi.fn()}
            onComment={vi.fn()}
            onUpdateField={vi.fn()}
            selected={false}
            onToggle={vi.fn()}
            rentalOptions={rentalOptions}
            periodUnits={periodUnits}
          />
        </TableBody>
      </Table>,
    );

    const cells = container.querySelectorAll("td");
    expect(cells.length).toBe(12);

    // Cell 3: Rental/Purchase
    expect(cells[3].textContent).toContain("Purchase");
    // Cell 6: Period Unit should show N/A for purchase
    expect(cells[6].textContent).toBe("N/A");
    // Cell 7: Usage Duration should show N/A for purchase
    expect(cells[7].textContent).toBe("N/A");
    // Cell 8: Maintenance cost
    expect(cells[8].textContent).toContain("100");
    // Cell 9: Fuel cost
    expect(cells[9].textContent).toContain("40");
    // Cell 10: Estimated Total (1 * 5000 + 100 + 40 = 5140)
    expect(cells[10].textContent).toContain("5,140");
    // Cell 11: Actions column
    expect(cells[11].querySelectorAll("button").length).toBe(4);
  });
});

describe("EquipmentForm", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function renderForm(props: Partial<React.ComponentProps<typeof EquipmentForm>> = {}) {
    return render(
      <QueryClientProvider client={queryClient}>
        <EquipmentForm
          key={props.defaultValues?.rental_or_purchase || "default"}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          isSubmitting={false}
          groups={[]}
          currency="USD"
          rentalOptions={rentalOptions}
          isLoadingRentalOptions={false}
          periodUnits={periodUnits}
          isLoadingPeriodUnits={false}
          {...props}
        />
      </QueryClientProvider>,
    );
  }

  it("shows rental fields when Rental is selected and hides them when Purchase is selected", () => {
    const { rerender } = renderForm({
      defaultValues: { rental_or_purchase: "Rental" },
    });

    // When Rental -> Period Unit and Usage Duration are shown
    expect(screen.getByText("Period Unit")).toBeTruthy();
    expect(screen.getByText("Usage Duration")).toBeTruthy();
    expect(screen.getByText(/Cost per Period/)).toBeTruthy();

    // Rerender with Purchase
    rerender(
      <QueryClientProvider client={queryClient}>
        <EquipmentForm
          key="Purchase"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          isSubmitting={false}
          groups={[]}
          currency="USD"
          rentalOptions={rentalOptions}
          isLoadingRentalOptions={false}
          periodUnits={periodUnits}
          isLoadingPeriodUnits={false}
          defaultValues={{ rental_or_purchase: "Purchase" }}
        />
      </QueryClientProvider>,
    );

    // Period Unit and Usage Duration are now hidden, Purchase Cost is shown
    expect(screen.queryByText("Period Unit")).toBeNull();
    expect(screen.queryByText("Usage Duration")).toBeNull();
    expect(screen.getByText(/Purchase Cost/)).toBeTruthy();
  });

  it("submits purchase equipment with proper defaults for rental-specific fields", async () => {
    const onSubmit = vi.fn();
    renderForm({
      onSubmit,
      defaultValues: { rental_or_purchase: "Purchase" },
    });

    // Fill name
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Bulldozer" } });

    // Fill purchase cost
    const costInput = screen.getByLabelText("Purchase Cost");
    fireEvent.change(costInput, { target: { value: "75000" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /save|common:save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe("Bulldozer");
    expect(submittedData.rental_or_purchase).toBe("Purchase");
    expect(submittedData.cost_per_period).toBe(75000);
    expect(submittedData.period_unit).toBeTruthy();
    expect(submittedData.usage_duration).toBe(1);
  });
});
