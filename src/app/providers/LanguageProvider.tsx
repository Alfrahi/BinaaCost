import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DirectionProvider } from "@radix-ui/react-direction";

const RTL_LANGUAGES = ["ar", "he", "fa"];

export function isRtlLanguage(language?: string): boolean {
  if (!language) return false;
  const lang = language.toLowerCase();
  return RTL_LANGUAGES.some(
    (rtlLang) => lang === rtlLang || lang.startsWith(`${rtlLang}-`) || lang.startsWith(`${rtlLang}_`),
  );
}

export default function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const isRtl =
    (typeof i18n.dir === "function" && i18n.dir() === "rtl") ||
    isRtlLanguage(i18n.language);
  const dir = isRtl ? "rtl" : "ltr";

  // Set dir/lang synchronously during render to avoid an LTR flash for Arabic
  // users before the effect runs. The effect keeps it in sync on language
  // changes and also updates the document <title>.
  if (typeof document !== "undefined") {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
    const title = i18n.t("common:appTitle");
    if (title && title !== "common:appTitle") {
      document.title = title;
    }
  }, [dir, i18n]);

  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}
