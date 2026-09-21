import { describe, it, expect } from "vitest";
import { cn, getIconMarginClass } from "../utils";

describe("shared utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      const result = cn("text-sm", "font-bold");
      expect(result).toBe("text-sm font-bold");
    });

    it("handles conditional classes and falsy values", () => {
      const isVisible = false;
      const isActive = true;
      const result = cn("base-class", isVisible && "hidden", isActive && "active");
      expect(result).toBe("base-class active");
    });

    it("resolves Tailwind conflicting classes using tailwind-merge", () => {
      const result = cn("p-4", "p-2");
      expect(result).toBe("p-2");
    });
  });

  describe("getIconMarginClass", () => {
    it("returns RTL-safe logical margin 'me-2'", () => {
      expect(getIconMarginClass()).toBe("me-2");
    });
  });
});
