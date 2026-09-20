import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FormatCurrencyOptions {
  notation?: "standard" | "scientific" | "engineering" | "compact";
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showSign?: boolean;
  compact?: boolean;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getCachedFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}|${options.currency}|${options.notation || "standard"}|${options.minimumFractionDigits}|${options.maximumFractionDigits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export const useCurrencyFormatter = () => {
  const { i18n } = useTranslation();

  const format = useCallback(
    (
      amount: number,
      currencyCode: string,
      options?: FormatCurrencyOptions,
    ): string => {
      const locale = i18n.language || "en";

      const defaultOptions: Intl.NumberFormatOptions = {
        style: "currency",
        currency: currencyCode || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };

      if (options?.notation) {
        defaultOptions.notation = options.notation;
      }
      if (options?.minimumFractionDigits !== undefined) {
        defaultOptions.minimumFractionDigits = options.minimumFractionDigits;
      }
      if (options?.maximumFractionDigits !== undefined) {
        defaultOptions.maximumFractionDigits = options.maximumFractionDigits;
      }
      if (options?.compact) {
        defaultOptions.notation = "compact";
      }

      try {
        const formatter = getCachedFormatter(locale, defaultOptions);
        let formatted = formatter.format(amount);

        // showSign: prepend "+" for positive values. Detect sign from the
        // numeric value rather than the formatted string, since Arabic locale
        // uses U+2212 (−) for negatives and the ASCII "-" check would miss it.
        if (options?.showSign && amount > 0) {
          formatted = "+" + formatted;
        }

        return formatted;
      } catch (_) {
        // Fallback without side-effects or toast spam
        const numStr = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
        return `${numStr} ${currencyCode || ""}`.trim();
      }
    },
    [i18n.language],
  );

  return { format };
};
