import { describe, it, expect } from "vitest";
import { round, safeAdd, safeMult, safeSub, safeDiv } from "../math";

describe("Math Utils", () => {
  describe("round", () => {
    it("rounds to 2 decimal places by default", () => {
      expect(round(10.555)).toBe(10.56);
      expect(round(10.554)).toBe(10.55);
    });

    it("rounds to specified decimal places", () => {
      expect(round(10.5555, 3)).toBe(10.556);
      expect(round(10.5, 0)).toBe(11);
    });

    it("handles zero and null", () => {
      expect(round(0)).toBe(0);
      expect(round(null)).toBe(0);
    });
  });

  describe("safeAdd", () => {
    it("adds numbers correctly with floating point precision", () => {
      expect(safeAdd(0.1, 0.2)).toBe(0.3);
    });

    it("adds multiple numbers", () => {
      expect(safeAdd(1, 2, 3, 4)).toBe(10);
    });
  });

  describe("safeMult", () => {
    it("multiplies numbers correctly", () => {
      expect(safeMult(10, 0.1)).toBe(1);
      expect(safeMult(3, 0.33)).toBe(0.99);
    });

    it("handles zero", () => {
      expect(safeMult(10, 0)).toBe(0);
    });
  });

  describe("safeSub", () => {
    it("subtracts numbers correctly", () => {
      expect(safeSub(10, 3)).toBe(7);
      expect(safeSub(0.3, 0.1)).toBe(0.2);
    });
  });

  describe("safeDiv", () => {
    it("divides numbers correctly", () => {
      expect(safeDiv(10, 2)).toBe(5);
      expect(safeDiv(1, 3)).toBe(0.33);
    });

    it("handles division by zero gracefully", () => {
      expect(safeDiv(10, 0)).toBe(0);
    });
  });
});
