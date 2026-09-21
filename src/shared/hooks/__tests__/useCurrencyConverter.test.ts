import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCurrencyConverter } from "../useCurrencyConverter";

const mockRates = [
  { currency_code: "USD", rate_to_usd: 1.0, last_updated: "2026-09-20T00:00:00Z" },
  { currency_code: "EUR", rate_to_usd: 0.92, last_updated: "2026-09-20T00:00:00Z" },
  { currency_code: "SAR", rate_to_usd: 3.75, last_updated: "2026-09-20T00:00:00Z" },
];

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: mockRates,
    isLoading: false,
  }),
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: () => ({
      getFullList: vi.fn().mockResolvedValue(mockRates),
    }),
  },
}));

describe("useCurrencyConverter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRate", () => {
    it("returns correct rate to USD for known currencies", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.getRate("USD")).toBe(1.0);
      expect(result.current.getRate("EUR")).toBe(0.92);
      expect(result.current.getRate("SAR")).toBe(3.75);
    });

    it("handles lowercase and currency with descriptor suffix", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.getRate("usd")).toBe(1.0);
      expect(result.current.getRate("SAR (Saudi Riyal)")).toBe(3.75);
    });

    it("returns null for unknown currencies", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.getRate("XYZ")).toBeNull();
    });
  });

  describe("getMissingRates", () => {
    it("returns empty array when source and target currencies are identical", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.getMissingRates("USD", "USD")).toEqual([]);
      expect(result.current.getMissingRates("SAR", "SAR")).toEqual([]);
    });

    it("returns empty array when both currencies exist", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.getMissingRates("USD", "SAR")).toEqual([]);
    });

    it("identifies missing currencies", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.getMissingRates("USD", "XYZ")).toEqual(["XYZ"]);
      expect(result.current.getMissingRates("ABC", "XYZ")).toEqual(["ABC", "XYZ"]);
    });
  });

  describe("convert", () => {
    it("returns 0 for falsy amounts", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.convert(0, "USD", "SAR")).toBe(0);
    });

    it("returns original amount when from and to currencies match", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.convert(150, "USD", "USD")).toBe(150);
    });

    it("converts USD to SAR accurately using decimal math", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      // 100 USD * (3.75 / 1.0) = 375.00
      expect(result.current.convert(100, "USD", "SAR")).toBe(375);
    });

    it("converts SAR to USD accurately", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      // 375 SAR * (1.0 / 3.75) = 100.00
      expect(result.current.convert(375, "SAR", "USD")).toBe(100);
    });

    it("converts cross-currencies (EUR to SAR) accurately", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      // 100 EUR * (3.75 / 0.92) = 407.60869... -> 407.61
      expect(result.current.convert(100, "EUR", "SAR")).toBe(407.61);
    });

    it("returns original amount as fallback if rate is missing", () => {
      const { result } = renderHook(() => useCurrencyConverter());
      expect(result.current.convert(100, "USD", "UNKNOWN")).toBe(100);
    });
  });
});
