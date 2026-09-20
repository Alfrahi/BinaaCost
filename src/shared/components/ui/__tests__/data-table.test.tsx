import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DataTable, { DataTableColumn } from "../data-table";
import { TableCell, TableRow } from "@/shared/components/ui/table";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key.split(":").pop() || key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

interface TestItem {
  id: string;
  name: string;
  group_id?: string;
}

const columns: DataTableColumn<TestItem>[] = [
  { key: "name", label: "Name" },
];

const renderRow = (item: TestItem) => (
  <TableRow key={item.id}>
    <TableCell>{item.name}</TableCell>
  </TableRow>
);

describe("DataTable - Pagination", () => {
  it("slices ungrouped data to the current page when pageSize is provided", () => {
    const items: TestItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i + 1}`,
      name: `Item ${i + 1}`,
    }));

    // Page 0 with pageSize 10 should render items 1 to 10
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(i) => i.id}
        renderRow={renderRow}
        pagination={{
          currentPage: 0,
          totalPages: 3,
          pageSize: 10,
          onPageChange: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText("Item 1")).toBeTruthy();
    expect(screen.getByText("Item 10")).toBeTruthy();
    expect(screen.queryByText("Item 11")).toBeNull();

    // Page 1 with pageSize 10 should render items 11 to 20
    rerender(
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(i) => i.id}
        renderRow={renderRow}
        pagination={{
          currentPage: 1,
          totalPages: 3,
          pageSize: 10,
          onPageChange: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByText("Item 1")).toBeNull();
    expect(screen.getByText("Item 11")).toBeTruthy();
    expect(screen.getByText("Item 20")).toBeTruthy();
    expect(screen.queryByText("Item 21")).toBeNull();
  });

  it("slices grouped data and only shows group headers for groups present on that page", () => {
    const groups = [
      { id: "g1", name: "Foundation" },
      { id: "g2", name: "Framing" },
      { id: "g3", name: "Finishes" },
    ];

    const items: TestItem[] = [
      { id: "1", name: "Excavation", group_id: "g1" },
      { id: "2", name: "Footings", group_id: "g1" },
      { id: "3", name: "Rebar", group_id: "g1" },
      { id: "4", name: "Studs", group_id: "g2" },
      { id: "5", name: "Joists", group_id: "g2" },
      { id: "6", name: "Drywall", group_id: "g3" },
      { id: "7", name: "Paint", group_id: "g3" },
    ];

    // Page 0 with pageSize 4: contains items 1..3 (Foundation) and item 4 (Framing)
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(i) => i.id}
        renderRow={renderRow}
        groupRows={{
          groups,
          getGroupId: (i) => i.group_id,
        }}
        pagination={{
          currentPage: 0,
          totalPages: 2,
          pageSize: 4,
          onPageChange: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText("Foundation")).toBeTruthy();
    expect(screen.getByText("Framing")).toBeTruthy();
    expect(screen.queryByText("Finishes")).toBeNull();
    expect(screen.getByText("Excavation")).toBeTruthy();
    expect(screen.getByText("Studs")).toBeTruthy();
    expect(screen.queryByText("Joists")).toBeNull();

    // Page 1 with pageSize 4: contains item 5 (Framing) and items 6..7 (Finishes)
    rerender(
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(i) => i.id}
        renderRow={renderRow}
        groupRows={{
          groups,
          getGroupId: (i) => i.group_id,
        }}
        pagination={{
          currentPage: 1,
          totalPages: 2,
          pageSize: 4,
          onPageChange: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByText("Foundation")).toBeNull();
    expect(screen.getByText("Framing")).toBeTruthy();
    expect(screen.getByText("Finishes")).toBeTruthy();
    expect(screen.getByText("Joists")).toBeTruthy();
    expect(screen.getByText("Drywall")).toBeTruthy();
    expect(screen.getByText("Paint")).toBeTruthy();
  });
});
