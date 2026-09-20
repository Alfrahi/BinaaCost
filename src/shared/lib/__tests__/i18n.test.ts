import { describe, it, expect } from "vitest";
import i18n from "@/i18n";

describe("i18n configuration", () => {
  it("disables interpolation escapeValue so React handles XSS and slashes/characters are not HTML-escaped", () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });

  it("does not escape slashes in interpolated values", () => {
    const interpolated = i18n.t("testKey", {
      defaultValue: "Last edited {{date}}",
      date: "9/4/2026, 10:40:24 PM",
    });
    expect(interpolated).toBe("Last edited 9/4/2026, 10:40:24 PM");
    expect(interpolated).not.toContain("&#x2F;");
  });
});
