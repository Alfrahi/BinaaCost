import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { Decimal } from "@/shared/lib/math";
import { useCallback } from "react";

export interface CurrencyRate {
  currency_code: string;
  rate_to_usd: number;
  last_updated: string;
}

export function useCurrencyConverter() {
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["currency_rates"],
    queryFn: async () =>
      mapRecords<CurrencyRate>(
        await pb.collection("currency_rates").getFullList(),
      ),
    staleTime: 1000 * 60 * 60,
  });

  const getRate = useCallback(
    (currencyCode: string) => {
      const code = currencyCode?.split(" ")[0]?.toUpperCase();
      const rate = rates.find((r) => r.currency_code === code);
      return rate ? rate.rate_to_usd : null;
    },
    [rates],
  );

  const getMissingRates = useCallback(
    (fromCurrency: string, toCurrency: string): string[] => {
      if (fromCurrency === toCurrency) return [];
      const missing: string[] = [];
      if (getRate(fromCurrency) === null) missing.push(fromCurrency);
      if (getRate(toCurrency) === null) missing.push(toCurrency);
      return Array.from(new Set(missing));
    },
    [getRate],
  );

  const convert = useCallback(
    (amount: number, fromCurrency: string, toCurrency: string): number => {
      if (!amount) return 0;
      if (fromCurrency === toCurrency) return amount;

      const fromRate = getRate(fromCurrency);
      const toRate = getRate(toCurrency);

      if (!fromRate || !toRate) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `Missing conversion rate for ${fromCurrency} or ${toCurrency}`,
          );
        }
        return amount;
      }

      const result = new Decimal(amount)
        .times(new Decimal(toRate).dividedBy(new Decimal(fromRate)))
        .toDecimalPlaces(2)
        .toNumber();

      return result;
    },
    [getRate],
  );

  return {
    rates,
    isLoading,
    convert,
    getRate,
    getMissingRates,
  };
}
