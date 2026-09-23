import { describe, it, expect } from "vitest";
import { round, safeAdd, safeMult, safeSub, safeDiv } from "../math";

describe("Math Utils", () => {
  describe("round", () => {
    it("rounds to 0 decimal places by default", () => {
      expect(round(10.555)).toBe(11);
      expect(round(10.4)).toBe(10);
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
    it("adds numbers and rounds to integer", () => {
      expect(safeAdd(10.5, 20.4)).toBe(31);
    });

    it("adds multiple numbers", () => {
      expect(safeAdd(1, 2, 3, 4)).toBe(10);
    });
  });

  describe("safeMult", () => {
    it("multiplies numbers correctly and rounds to integer", () => {
      expect(safeMult(10, 1.15)).toBe(12); // 11.5 rounds to 12
      expect(safeMult(3, 3.33)).toBe(10); // 9.99 rounds to 10
    });

    it("handles zero", () => {
      expect(safeMult(10, 0)).toBe(0);
    });
  });

  describe("safeSub", () => {
    it("subtracts numbers correctly and rounds to integer", () => {
      expect(safeSub(10, 3)).toBe(7);
      expect(safeSub(10.4, 5.2)).toBe(5); // 5.2 rounds to 5
    });
  });

  describe("safeDiv", () => {
    it("divides numbers correctly and rounds to integer", () => {
      expect(safeDiv(10, 2)).toBe(5);
      expect(safeDiv(10, 3)).toBe(3); // 3.33 rounds to 3
    });

    it("handles division by zero gracefully", () => {
      expect(safeDiv(10, 0)).toBe(0);
    });
  });
});
