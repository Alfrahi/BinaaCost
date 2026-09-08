import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDateFormatter } from "@/hooks/useDateFormatter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ar" },
  }),
}));

describe("useDateFormatter", () => {
  it("formats a date using the active locale", () => {
    const { result } = renderHook(() => useDateFormatter());
    const out = result.current.formatDate(new Date(2026, 0, 15), "short");
    expect(out).toContain("2026");
  });

  it("returns an empty string for an invalid date", () => {
    const { result } = renderHook(() => useDateFormatter());
    expect(result.current.formatDate("not-a-date", "short")).toBe("");
  });

  it("produces non-Latin month names in Arabic when the runtime ICU supports it", () => {
    // Guard: some CI runtimes lack full Arabic ICU data. Only assert when the
    // runtime can actually render Arabic month names, so CI stays stable.
    const probe = new Intl.DateTimeFormat("ar", { month: "long" }).format(
      new Date(2026, 0, 15),
    );
    const supportsArabicMonths = /[\u0600-\u06FF]/.test(probe);
    if (!supportsArabicMonths) return;

    const { result } = renderHook(() => useDateFormatter());
    const out = result.current.formatDate(new Date(2026, 0, 15), "long");
    expect(/[\u0600-\u06FF]/.test(out)).toBe(true);
  });
});