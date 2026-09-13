import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DirectionProvider } from "@radix-ui/react-direction";

const RTL_LANGUAGES = ["ar", "he", "fa"];

export default function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const dir = RTL_LANGUAGES.includes(i18n.language) ? "rtl" : "ltr";

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
