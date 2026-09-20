import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { QuickAddRow, QuickAddField } from "../QuickAddRow";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "project_materials:nameRequired") return "Material name is required";
      return key.split(":").pop();
    },
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "Quantity must be greater than 0"),
  ),
  unit_price: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "Unit price must be greater than 0"),
  ),
});

const fields: QuickAddField[] = [
  { key: "name", label: "Name" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "unit_price", label: "Unit Price", type: "number" },
];

const buildValues = (raw: Record<string, string>) => ({
  name: raw.name,
  quantity: Number(raw.quantity),
  unit_price: Number(raw.unit_price),
});

function renderRow(onSubmit = vi.fn()) {
  render(
    <QuickAddRow
      fields={fields}
      schema={schema}
      buildValues={buildValues}
      onSubmit={onSubmit}
      submitLabel="Add"
      ariaLabel="Add item"
    />,
  );
  return {
    nameInput: screen.getByLabelText("Name") as HTMLInputElement,
    qtyInput: screen.getByLabelText("Quantity") as HTMLInputElement,
    priceInput: screen.getByLabelText("Unit Price") as HTMLInputElement,
    onSubmit,
  };
}

describe("QuickAddRow", () => {
  it("submits on Enter with validated values, clears fields, and refocuses the first field", async () => {
    const { nameInput, qtyInput, priceInput, onSubmit } = renderRow();

    fireEvent.change(nameInput, { target: { value: "Concrete" } });
    fireEvent.change(qtyInput, { target: { value: "10" } });
    fireEvent.change(priceInput, { target: { value: "5.5" } });

    fireEvent.keyDown(nameInput, { key: "Enter" });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Concrete",
      quantity: 10,
      unit_price: 5.5,
    });

    // Fields cleared and focus returned to the first field for the next item.
    expect(nameInput.value).toBe("");
    expect(qtyInput.value).toBe("");
    expect(priceInput.value).toBe("");
    expect(document.activeElement).toBe(nameInput);
  });

  it("shows an inline error and does not submit on invalid input", async () => {
    const { qtyInput, onSubmit } = renderRow();

    // name left empty → schema fails
    fireEvent.change(qtyInput, { target: { value: "10" } });
    fireEvent.keyDown(qtyInput, { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeTruthy(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("translates validation error keys through t()", async () => {
    const i18nSchema = z.object({
      name: z.string().min(1, "project_materials:nameRequired"),
    });

    render(
      <QuickAddRow
        fields={[{ key: "name", label: "Name" }]}
        schema={i18nSchema}
        buildValues={(raw) => ({ name: raw.name })}
        onSubmit={vi.fn()}
        submitLabel="Add"
        ariaLabel="Add item"
      />,
    );

    const input = screen.getByLabelText("Name");
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Material name is required");
    });
  });

  it("clears the row on Escape", () => {
    const { nameInput, qtyInput } = renderRow();

    fireEvent.change(nameInput, { target: { value: "Concrete" } });
    fireEvent.change(qtyInput, { target: { value: "10" } });

    fireEvent.keyDown(nameInput, { key: "Escape" });

    expect(nameInput.value).toBe("");
    expect(qtyInput.value).toBe("");
  });

  it("respects conditional visibility and formatLabel", () => {
    const conditionalFields: QuickAddField[] = [
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "Rental", label: "Rental" },
          { value: "Purchase", label: "Purchase" },
        ],
      },
      {
        key: "price",
        label: "Price",
        formatLabel: (vals) => (vals.type === "Purchase" ? "Purchase Price" : "Rental Rate"),
      },
      {
        key: "duration",
        label: "Duration",
        conditional: (vals) => vals.type !== "Purchase",
      },
    ];

    render(
      <QuickAddRow
        fields={conditionalFields}
        schema={z.object({ type: z.string(), price: z.string().optional() })}
        buildValues={(vals) => vals}
        onSubmit={vi.fn()}
        submitLabel="Add"
        ariaLabel="Add item"
      />,
    );

    // Initially type is "Rental" -> Duration is visible, Price label is "Rental Rate"
    expect(screen.getByLabelText("Rental Rate")).toBeTruthy();
    expect(screen.getByLabelText("Duration")).toBeTruthy();

    // Change type to "Purchase"
    const select = screen.getByLabelText("Type") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Purchase" } });

    // Duration is now hidden, Price label is "Purchase Price"
    expect(screen.queryByLabelText("Duration")).toBeNull();
    expect(screen.getByLabelText("Purchase Price")).toBeTruthy();
  });
});