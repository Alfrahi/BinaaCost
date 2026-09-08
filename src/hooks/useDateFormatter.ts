import { useCallback } from "react";
import { useTranslation } from "react-i18next";

type DateVariant = "short" | "medium" | "long" | "dateTime" | "time";

const VARIANT_OPTIONS: Record<
  DateVariant,
  Intl.DateTimeFormatOptions
> = {
  short: { year: "numeric", month: "short", day: "numeric" },
  medium: { year: "numeric", month: "long", day: "numeric" },
  long: {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  },
  dateTime: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  time: { hour: "numeric", minute: "2-digit" },
};

/**
 * Locale-aware date formatting via Intl.DateTimeFormat, driven by the active
 * i18n language. Replaces hardcoded date-fns format strings so month/day names
 * localize (e.g. Arabic) instead of leaking English.
 */
export function useDateFormatter() {
  const { i18n } = useTranslation();

  const formatDate = useCallback(
    (date: Date | string | number, variant: DateVariant = "medium") => {
      const d = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat(
        i18n.language,
        VARIANT_OPTIONS[variant],
      ).format(d);
    },
    [i18n.language],
  );

  return { formatDate };
}