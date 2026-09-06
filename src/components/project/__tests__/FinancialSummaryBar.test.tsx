import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key.split(":").pop(),
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/utils/formatCurrency", () => ({
  useCurrencyFormatter: () => ({
    format: (amount: number, currency: string) =>
      `${currency} ${amount.toFixed(2)}`,
  }),
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

import FinancialSummaryBar from "../FinancialSummaryBar";

const costs = {
  materialsTotal: 1000,
  laborTotal: 500,
  equipmentTotal: 200,
  additionalTotal: 300,
};

const settings = {
  overhead_percent: 10,
  markup_percent: 20,
  tax_percent: 5,
  contingency_percent: 5,
};

describe("FinancialSummaryBar", () => {
  it("renders the full financial chain from Direct Cost to Grand Total", () => {
    render(
      <FinancialSummaryBar
        costs={costs}
        currency="USD"
        settings={settings}
        onViewPricing={() => {}}
      />,
    );

    // direct 2000, overhead 200, contingency 100, markup 460, tax 138, grand total 2898
    expect(screen.getByText("profit_pricing.totalDirectCosts")).toBeTruthy();
    expect(screen.getByText("USD 2000.00")).toBeTruthy();
    expect(screen.getByText("profit_pricing.overhead")).toBeTruthy();
    expect(screen.getByText("USD 200.00")).toBeTruthy();
    expect(screen.queryByText("profit_pricing.contingency")).toBeNull();
    expect(
      screen.getByText("profit_pricing.generalContingency"),
    ).toBeTruthy();
    expect(screen.getByText("USD 100.00")).toBeTruthy();
    expect(screen.getByText("profit_pricing.markup")).toBeTruthy();
    expect(screen.getByText("USD 460.00")).toBeTruthy();
    expect(screen.getByText("profit_pricing.taxes")).toBeTruthy();
    expect(screen.getByText("USD 138.00")).toBeTruthy();
    expect(screen.getByText("profit_pricing.finalProjectTotal")).toBeTruthy();
    expect(screen.getByText("USD 2898.00")).toBeTruthy();
  });

  it("falls back to default settings when none are provided", () => {
    // defaults: overhead 10, markup 20, tax 0, contingency 5
    // direct 2000 → overhead 200, contingency 100, markup 460, tax 0, grand total 2760
    render(
      <FinancialSummaryBar
        costs={costs}
        currency="USD"
        onViewPricing={() => {}}
      />,
    );

    expect(screen.getByText("USD 2760.00")).toBeTruthy();
  });

  it("invokes onViewPricing when the pricing action is clicked", () => {
    const onViewPricing = vi.fn();
    render(
      <FinancialSummaryBar
        costs={costs}
        currency="USD"
        settings={settings}
        onViewPricing={onViewPricing}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /viewPricing/ }));
    expect(onViewPricing).toHaveBeenCalledTimes(1);
  });
});
