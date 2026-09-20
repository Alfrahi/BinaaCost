import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import LanguageProvider, { isRtlLanguage } from "../LanguageProvider";

let mockLanguage = "en";
const mockI18n = {
  get language() {
    return mockLanguage;
  },
  dir: vi.fn(() => (isRtlLanguage(mockLanguage) ? "rtl" : "ltr")),
  t: vi.fn((key: string) => key),
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: mockI18n,
  }),
}));

describe("isRtlLanguage", () => {
  it("correctly identifies standard RTL language codes", () => {
    expect(isRtlLanguage("ar")).toBe(true);
    expect(isRtlLanguage("he")).toBe(true);
    expect(isRtlLanguage("fa")).toBe(true);
  });

  it("correctly identifies regional RTL locales like ar-SA and ar-EG", () => {
    expect(isRtlLanguage("ar-SA")).toBe(true);
    expect(isRtlLanguage("ar-EG")).toBe(true);
    expect(isRtlLanguage("ar-AE")).toBe(true);
    expect(isRtlLanguage("ar_SA")).toBe(true);
    expect(isRtlLanguage("he-IL")).toBe(true);
    expect(isRtlLanguage("fa-IR")).toBe(true);
  });

  it("returns false for LTR languages", () => {
    expect(isRtlLanguage("en")).toBe(false);
    expect(isRtlLanguage("en-US")).toBe(false);
    expect(isRtlLanguage("fr")).toBe(false);
    expect(isRtlLanguage("es")).toBe(false);
    expect(isRtlLanguage(undefined)).toBe(false);
    expect(isRtlLanguage("")).toBe(false);
  });
});

describe("LanguageProvider", () => {
  beforeEach(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  });

  it("sets document dir to rtl for regional Arabic locale ar-SA", () => {
    mockLanguage = "ar-SA";
    render(
      <LanguageProvider>
        <div>Content</div>
      </LanguageProvider>,
    );

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar-SA");
  });

  it("sets document dir to ltr for English", () => {
    mockLanguage = "en";
    render(
      <LanguageProvider>
        <div>Content</div>
      </LanguageProvider>,
    );

    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
  });
});
