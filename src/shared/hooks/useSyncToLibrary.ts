import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { callRoute } from "@/integrations/pocketbase/routes";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";

/**
 * Generic library sync hook.
 *
 * Encapsulates the three-step pattern repeated across Materials, Labor, Equipment:
 *   1. Verify user is logged in
 *   2. Check all required currency rates exist (from projectCurrency → USD)
 *   3. POST a upsert payload to the given JSVM route
 *
 * @param routeName     JSVM route key, e.g. "upsert/library_materials"
 * @param buildPayload  Called per-sync with the raw item, a partially-applied
 *                      convert helper (from=projectCurrency, to="USD"), and the
 *                      current userId — returns the upsert body.
 */
export function useSyncToLibrary<TItem>(
  routeName: string,
  buildPayload: (
    item: TItem,
    /** Converts `amount` from projectCurrency to USD. */
    convertToUSD: (amount: number) => number,
    userId: string,
  ) => Record<string, unknown>,
) {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { convert, getMissingRates } = useCurrencyConverter();

  const syncToLibrary = useCallback(
    async (item: TItem, projectCurrency: string) => {
      if (!user?.id) {
        throw new Error(t("common:mustBeLoggedIn"));
      }

      const missing = getMissingRates(projectCurrency, "USD");
      if (missing.length > 0) {
        toast.warning(
          t("common:missingRateWarning", { currency: missing.join(", ") }),
        );
        return;
      }

      const convertToUSD = (amount: number) => convert(amount, projectCurrency, "USD");
      const payload = buildPayload(item, convertToUSD, user.id);
      await callRoute(routeName, payload);
    },
    // buildPayload is defined inline by callers; wrapping in useCallback at the
    // call site is optional because this hook's own useCallback captures by ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, t, getMissingRates, convert, routeName],
  );

  return { syncToLibrary };
}
