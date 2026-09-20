import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { countIncompleteItems } from "@/shared/logic/overview";
import OverviewTab from "../OverviewTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === "project_overview:lastEdited" && opts?.date) {
        return `Last edited ${opts.date}`;
      }
      return key.split(":").pop();
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const base = {
  project: {
    currency: "USD",
    financial_settings_confirmed: true,
  } as any,
  sizeUnits: [],
  projectTypes: [],
  durationUnits: [],
};

describe("countIncompleteItems", () => {
  it("counts items with missing/zero cost data across categories", () => {
    const count = countIncompleteItems({
      ...base,
      materials: [
        { id: "m1", quantity: 2, unit_price: 10 },
        { id: "m2", quantity: 0, unit_price: 10 },
        { id: "m3", quantity: 1, unit_price: 0 },
      ] as any,
      labor: [
        { id: "l1", number_of_workers: 2, daily_rate: 100, total_days: 5 },
        { id: "l2", number_of_workers: 0, daily_rate: 100, total_days: 5 },
      ] as any,
      equipment: [
        { id: "e1", cost_per_period: 100, quantity: 1 },
        { id: "e2", cost_per_period: null, quantity: 1 },
      ] as any,
      additional: [{ id: "a1", amount: 0 }] as any,
    });

    // m2 (qty 0), m3 (price 0), l2 (workers 0), e2 (null cost), a1 (amount 0)
    expect(count).toBe(5);
  });

  it("is zero when all items are complete", () => {
    const count = countIncompleteItems({
      ...base,
      materials: [{ id: "m1", quantity: 2, unit_price: 10 }] as any,
      labor: [
        { id: "l1", number_of_workers: 2, daily_rate: 100, total_days: 5 },
      ] as any,
      equipment: [{ id: "e1", cost_per_period: 100, quantity: 1 }] as any,
      additional: [{ id: "a1", amount: 50 }] as any,
    });
    expect(count).toBe(0);
  });
});

describe("OverviewTab", () => {
  it("renders last edited date formatted without HTML escaping artifacts", () => {
    const { container } = render(
      <OverviewTab
        {...base}
        project={{
          ...base.project,
          name: "Test Project",
          type: "residential",
          size: 100,
          size_unit: "sqm",
          duration_days: 30,
          duration_unit: "days",
          updated_at: "2026-09-04T22:40:24.000Z",
        }}
      />,
    );

    const text = container.textContent || "";
    expect(text).not.toContain("&#x2F;");
    expect(text).not.toContain("&amp;");
    expect(text).toContain("2026");
  });
});

