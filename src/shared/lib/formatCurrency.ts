import { useTranslation } from "react-i18next";
import { handleError } from "./toast";

interface FormatCurrencyOptions {
  notation?: "standard" | "scientific" | "engineering" | "compact";
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showSign?: boolean;
  compact?: boolean;
}

export const useCurrencyFormatter = () => {
  const { i18n } = useTranslation();

  const format = (
    amount: number,
    currencyCode: string,
    options?: FormatCurrencyOptions,
  ) => {
    const locale = i18n.language;

    const defaultOptions: Intl.NumberFormatOptions = {
      style: "currency",
      currency: currencyCode,
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
      const formatter = new Intl.NumberFormat(locale, defaultOptions);
      let formatted = formatter.format(amount);

      // showSign: prepend "+" for positive values. Detect sign from the
      // numeric value rather than the formatted string, since Arabic locale
      // uses U+2212 (−) for negatives and the ASCII "-" check would miss it.
      if (options?.showSign && amount > 0) {
        formatted = "+" + formatted;
      }

      return formatted;
    } catch (e) {
      handleError(e);
      return `${amount} ${currencyCode}`;
    }
  };

  return { format };
};
