import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table, TableBody } from "@/shared/components/ui/table";
import { LaborRow } from "../LaborRow";
import { LaborItem } from "../../types/items";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.defaultValue) return opts.defaultValue;
      return key.split(":").pop()?.split(".").pop() || key;
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/shared/lib/formatCurrency", () => ({
  useCurrencyFormatter: () => ({
    format: (val: number, cur: string) => `${cur} ${Number(val).toFixed(2)}`,
  }),
}));

describe("LaborRow", () => {
  const baseItem: LaborItem = {
    id: "l-1",
    user_id: "u-1",
    project_id: "p-1",
    worker_type: "Carpenter",
    number_of_workers: 3,
    daily_rate: 150,
    total_days: 4,
    total_cost: 999999, // Stale total_cost that should be ignored
    created_at: "2026-01-01",
    updated_at: "2026-01-01", version: 1,
  };

  it("derives row total from source fields rather than trusting stale cached total_cost", () => {
    render(
      <Table>
        <TableBody>
          <LaborRow
            item={baseItem}
            currency="USD"
            isOwner={true}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDuplicate={vi.fn()}
            onComment={vi.fn()}
            onUpdateField={vi.fn()}
            selected={false}
            onToggle={vi.fn()}
            locationFactor={1}
          />
        </TableBody>
      </Table>,
    );

    // 3 workers * $150/day * 4 days = $1800.00
    // Must NOT display stale $999999.00
    expect(screen.getByText("USD 1800.00")).toBeDefined();
    expect(screen.queryByText("USD 999999.00")).toBeNull();
  });

  it("calculates correctly with fractional labor days", () => {
    const fractionalItem: LaborItem = {
      ...baseItem,
      number_of_workers: 2,
      daily_rate: 160,
      total_days: 2.5,
      total_cost: 88888, // Stale
    };

    render(
      <Table>
        <TableBody>
          <LaborRow
            item={fractionalItem}
            currency="USD"
            isOwner={true}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDuplicate={vi.fn()}
            onComment={vi.fn()}
            onUpdateField={vi.fn()}
            selected={false}
            onToggle={vi.fn()}
            locationFactor={1}
          />
        </TableBody>
      </Table>,
    );

    // 2 workers * $160/day * 2.5 days = $800.00
    expect(screen.getByText("USD 800.00")).toBeDefined();
    expect(screen.queryByText("USD 88888.00")).toBeNull();
  });

  it("applies location factor to derived labor total", () => {
    render(
      <Table>
        <TableBody>
          <LaborRow
            item={baseItem}
            currency="USD"
            isOwner={true}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onDuplicate={vi.fn()}
            onComment={vi.fn()}
            onUpdateField={vi.fn()}
            selected={false}
            onToggle={vi.fn()}
            locationFactor={1.2}
            locationLabel="Riyadh"
          />
        </TableBody>
      </Table>,
    );

    // 3 * 150 * 4 = 1800 * 1.2 = $2160.00
    expect(screen.getByText("USD 2160.00")).toBeDefined();
  });
});
