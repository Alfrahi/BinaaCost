import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export interface FormatCurrencyOptions {
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
  const key = `${locale}|${options.currency}|${options.notation || "standard"}|${options.minimumFractionDigits}|${options.maximumFractionDigits}|${options.signDisplay || "auto"}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale = "en",
  options?: FormatCurrencyOptions,
): string {
  // The database and all domain logic store monetary values multiplied by 100 (fixed-point scale 2).
  // We divide by 100 to convert back to the true decimal amount before handing off to Intl.NumberFormat,
  // which is natively currency-aware and knows how to format the decimal value correctly.
  const rawAmount = Number.isFinite(amount) ? amount : 0;
  const numericAmount = rawAmount / 100;

  const defaultOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currencyCode || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: options?.showSign ? "exceptZero" : "auto",
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
    return formatter.format(numericAmount);
  } catch (_) {
    // Fallback without side-effects or toast spam
    const numStr = numericAmount.toFixed(2);
    const signPrefix = options?.showSign && numericAmount > 0 ? "+" : "";
    return `${signPrefix}${numStr} ${currencyCode || ""}`.trim();
  }
}

export const useCurrencyFormatter = () => {
  const { i18n } = useTranslation();

  const format = useCallback(
    (
      amount: number,
      currencyCode: string,
      options?: FormatCurrencyOptions,
    ): string => {
      return formatCurrency(amount, currencyCode, i18n.language || "en", options);
    },
    [i18n.language],
  );

  return { format };
};
