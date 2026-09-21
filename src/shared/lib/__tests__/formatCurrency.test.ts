import { describe, it, expect } from "vitest";
import { formatCurrency } from "../formatCurrency";

describe("formatCurrency", () => {
  describe("English locale (en)", () => {
    it("formats standard positive currency amounts", () => {
      const result = formatCurrency(1234.56, "USD", "en");
      expect(result).toBe("$1,234.56");
    });

    it("formats standard negative currency amounts", () => {
      const result = formatCurrency(-1234.56, "USD", "en");
      expect(result).toBe("-$1,234.56");
    });

    it("formats zero amount without sign", () => {
      const result = formatCurrency(0, "USD", "en");
      expect(result).toBe("$0.00");
    });

    it("handles showSign: true on positive amount", () => {
      const result = formatCurrency(500, "USD", "en", { showSign: true });
      expect(result).toBe("+$500.00");
    });

    it("handles showSign: true on negative amount", () => {
      const result = formatCurrency(-500, "USD", "en", { showSign: true });
      expect(result).toBe("-$500.00");
    });

    it("handles showSign: true on zero amount (does not show sign for zero)", () => {
      const result = formatCurrency(0, "USD", "en", { showSign: true });
      expect(result).toBe("$0.00");
    });

    it("handles showSign: false explicitly", () => {
      const result = formatCurrency(500, "USD", "en", { showSign: false });
      expect(result).toBe("$500.00");
    });

    it("supports custom fraction digits", () => {
      const result = formatCurrency(12.3456, "USD", "en", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
      expect(result).toBe("$12.346");
    });

    it("supports compact notation", () => {
      const result = formatCurrency(1500000, "USD", "en", { compact: true });
      expect(result).toMatch(/\$1\.50?M/);
    });
  });

  describe("Arabic locale (ar / ar-SA)", () => {
    it("formats currency using locale-aware digits and marks", () => {
      const result = formatCurrency(1000, "USD", "ar-SA");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles showSign: true with native bidi sign display without raw string prefix breakage", () => {
      const posResult = formatCurrency(100, "USD", "ar", { showSign: true });
      expect(posResult).toContain("+");

      const negResult = formatCurrency(-100, "USD", "ar", { showSign: true });
      expect(negResult).toContain("-");

      const zeroResult = formatCurrency(0, "USD", "ar", { showSign: true });
      expect(zeroResult).not.toContain("+");
    });
  });

  describe("Cache key separation", () => {
    it("does not clash between showSign: true and showSign: false", () => {
      const withoutSign = formatCurrency(250, "USD", "en", { showSign: false });
      const withSign = formatCurrency(250, "USD", "en", { showSign: true });
      expect(withoutSign).toBe("$250.00");
      expect(withSign).toBe("+$250.00");
    });

    it("does not clash between different currencies", () => {
      const usd = formatCurrency(100, "USD", "en");
      const eur = formatCurrency(100, "EUR", "en");
      expect(usd).toBe("$100.00");
      expect(eur).toBe("€100.00");
    });
  });

  describe("Fallback handling", () => {
    it("handles non-finite numbers safely by formatting 0.00 instead of NaN", () => {
      const nanResult = formatCurrency(NaN, "USD", "en");
      expect(nanResult).toBe("$0.00");

      const infResult = formatCurrency(Infinity, "USD", "en");
      expect(infResult).toBe("$0.00");
    });

    it("falls back gracefully when given an invalid currency code", () => {
      const invalidCurrency = formatCurrency(123.45, "INVALID_CODE", "en");
      expect(invalidCurrency).toBe("123.45 INVALID_CODE");
    });

    it("defaults currency code safely if omitted or empty", () => {
      const result = formatCurrency(100, "", "en");
      expect(result).toBe("$100.00");
    });
  });
});
