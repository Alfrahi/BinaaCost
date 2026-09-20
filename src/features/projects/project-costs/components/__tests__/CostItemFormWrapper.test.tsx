import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import {
  CostItemFormActions,
  CostItemGroupSelect,
  CostItemFormWrapper,
} from "../CostItemFormWrapper";
import { Form } from "@/shared/components/ui/form";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key.split(":").pop(),
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

describe("CostItemFormWrapper and shared primitives", () => {
  describe("CostItemFormActions", () => {
    it("renders cancel and save buttons and handles cancel click", () => {
      const onCancel = vi.fn();
      render(
        <CostItemFormActions onCancel={onCancel} isSubmitting={false} />,
      );

      const cancelBtn = screen.getByRole("button", { name: "cancel" });
      const saveBtn = screen.getByRole("button", { name: "save" });

      expect(cancelBtn).toBeDefined();
      expect(saveBtn).toBeDefined();
      expect((saveBtn as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("displays saving state and disables save button when submitting", () => {
      const onCancel = vi.fn();
      render(
        <CostItemFormActions onCancel={onCancel} isSubmitting={true} />,
      );

      const saveBtn = screen.getByRole("button", { name: "saving" });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe("CostItemGroupSelect", () => {
    function TestForm({ enabled = true }: { enabled?: boolean }) {
      const form = useForm({
        defaultValues: { group_id: "ungrouped" },
      });

      return (
        <Form {...form}>
          <form>
            <CostItemGroupSelect
              control={form.control}
              name="group_id"
              groups={[
                { id: "g1", name: "Foundation" },
                { id: "g2", name: "Framing" },
              ]}
              enabled={enabled}
            />
          </form>
        </Form>
      );
    }

    it("renders group select when enabled", () => {
      render(<TestForm enabled={true} />);
      expect(screen.getByText("groups.assignGroup")).toBeDefined();
    });

    it("does not render when enabled is false", () => {
      render(<TestForm enabled={false} />);
      expect(screen.queryByText("groups.assignGroup")).toBeNull();
    });
  });

  describe("CostItemFormWrapper", () => {
    it("wraps children with action buttons", () => {
      const onCancel = vi.fn();
      render(
        <CostItemFormWrapper onCancel={onCancel} isSubmitting={false}>
          <div data-testid="child-content">Form Fields</div>
        </CostItemFormWrapper>,
      );

      expect(screen.getByTestId("child-content")).toBeDefined();
      expect(screen.getByRole("button", { name: "save" })).toBeDefined();
    });
  });
});
