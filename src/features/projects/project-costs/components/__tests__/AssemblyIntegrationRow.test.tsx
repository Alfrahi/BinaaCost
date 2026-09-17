import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssemblyIntegrationRow } from "@/features/projects/project-costs/components/AssemblyIntegrationRow";
import { filterAssemblyItemsByType } from "@/shared/lib/assemblyUtils";
import { AssemblyItem } from "@/features/cost-library/assemblies/types/assemblies";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key.split(".").pop(),
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/features/cost-library/hooks/useAssemblies", () => ({
  useAssemblies: () => ({
    allAssemblies: [
      { id: "a1", name: "Wall Panel Assembly" },
      { id: "a2", name: "Foundation Assembly" },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/features/projects/project-costs/hooks/useAssemblyItems", () => ({
  useAssemblyItems: () => ({
    itemsQuery: {
      data: [
        { id: "1", item_type: "material", description: "Concrete", quantity: 5, unit_price: 100 },
        { id: "2", item_type: "labor", description: "Labor hours", quantity: 2, unit_price: 50 },
        { id: "3", item_type: "material", description: "Bricks", quantity: 10, unit_price: 20 },
      ],
      isLoading: false,
    },
  }),
}));

vi.mock("@/shared/lib/formatCurrency", () => ({
  useCurrencyFormatter: () => ({
    format: (v: number) => `$${v}`,
  }),
}));

describe("filterAssemblyItemsByType", () => {
  const items = [
    { id: "1", item_type: "material" as const, description: "Concrete", quantity: 5, unit_price: 100 },
    { id: "2", item_type: "labor" as const, description: "Labor hours", quantity: 2, unit_price: 50 },
    { id: "3", item_type: "material" as const, description: "Bricks", quantity: 10, unit_price: 20 },
    { id: "4", item_type: "equipment" as const, description: "Crane", quantity: 1, unit_price: 500 },
  ] as unknown[] as AssemblyItem[];

  it("filters to only the requested item type", () => {
    const materials = filterAssemblyItemsByType(items, ["material"]);
    expect(materials).toHaveLength(2);
    expect(materials.map((i: any) => i.item_type)).toEqual(["material", "material"]);
  });

  it("includes multiple types when requested", () => {
    const both = filterAssemblyItemsByType(items, ["material", "labor"]);
    expect(both).toHaveLength(3);
  });

  it("returns empty array for a type with no items", () => {
    const equipment = filterAssemblyItemsByType(items, ["equipment"]);
    expect(equipment).toHaveLength(1);
    expect(equipment[0].item_type).toBe("equipment");
  });
});

describe("AssemblyIntegrationRow", () => {
  it("renders the Add from Assembly button", () => {
    render(
      <AssemblyIntegrationRow
        itemTypes={["material"]}
        onImport={{ materials: vi.fn() }}
      />,
    );
    expect(screen.getByText("addFromAssembly")).toBeTruthy();
  });

  it("opens dialog when button is clicked", () => {
    render(
      <AssemblyIntegrationRow
        itemTypes={["material"]}
        onImport={{ materials: vi.fn() }}
      />,
    );
    fireEvent.click(screen.getByText("addFromAssembly"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});