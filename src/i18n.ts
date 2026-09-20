import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

const namespaces = [
  "common",
  "navigation",
  "auth",
  "dashboard",
  "errors",
  "roles",
  "durations",

  "project_detail",
  "project_tabs",
  "project_overview",
  "project_costs",
  "project_materials",
  "project_labor",
  "project_equipment",
  "project_additional",
  "project_risk",
  "project_reports",
  "project_versions",
  "project_form",

  "settings",
  "admin",
  "pages",
  "resources",
  "scenario_analysis",
];

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["en", "ar"],
    fallbackLng: "en",
    debug: false,
    ns: namespaces,
    defaultNS: "common",
    detection: {
      order: ["querystring", "cookie", "localStorage", "path"],
      caches: ["cookie"],
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    react: {
      useSuspense: true,
    },
    interpolation: {
      escapeValue: false,
    },
    missingKeyHandler: function (
      lngs: readonly string[],
      ns: string,
      key: string,
      _fallbackValue: string,
      _updateMissing: boolean,
      options: any,
    ) {
      if (options?.ignoreMissingWithoutContext) {
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `i18n: Missing translation key "${key}" in namespace "${ns}" for language "${lngs[0]}"`,
        );
      }
    },
  });

export default i18n;
