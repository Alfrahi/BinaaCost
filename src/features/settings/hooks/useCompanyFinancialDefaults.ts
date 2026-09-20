import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/shared/lib/toast";

export interface CompanyFinancialDefaults {
  overhead_percent: number;
  markup_percent: number;
  tax_percent: number;
  contingency_percent: number;
  default_currency: string;
}

export const DEFAULT_COMPANY_FINANCIALS: CompanyFinancialDefaults = {
  overhead_percent: 10,
  markup_percent: 20,
  tax_percent: 0,
  contingency_percent: 5,
  default_currency: "USD",
};

export function useCompanyFinancialDefaults() {
  const { t } = useTranslation(["admin", "common"]);
  const queryClient = useQueryClient();
  const queryKey = ["app_settings", "financial_defaults"];

  const {
    data: defaults = DEFAULT_COMPANY_FINANCIALS,
    isLoading,
    error,
  } = useQuery<CompanyFinancialDefaults>({
    queryKey,
    queryFn: async () => {
      try {
        const record = await pb
          .collection("app_settings")
          .getFirstListItem('key="financial_defaults"');
        return {
          ...DEFAULT_COMPANY_FINANCIALS,
          ...(record.value as Partial<CompanyFinancialDefaults>),
        };
      } catch (e: any) {
        if (e?.status === 404) return DEFAULT_COMPANY_FINANCIALS;
        throw e;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateDefaultsMutation = useMutation({
    mutationFn: async (newValue: Partial<CompanyFinancialDefaults>) => {
      let record;
      try {
        record = await pb
          .collection("app_settings")
          .getFirstListItem('key="financial_defaults"');
      } catch (e: any) {
        if (e?.status !== 404) throw e;
      }

      const mergedValue: CompanyFinancialDefaults = {
        ...DEFAULT_COMPANY_FINANCIALS,
        ...(record ? (record.value as CompanyFinancialDefaults) : {}),
        ...newValue,
      };

      if (record) {
        return await pb.collection("app_settings").update(record.id, {
          value: mergedValue,
        });
      } else {
        return await pb.collection("app_settings").create({
          key: "financial_defaults",
          value: mergedValue,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(t("admin:appSettings.successSaved"));
    },
    onError: (err: any) => {
      handleError(err);
    },
  });

  return {
    defaults,
    isLoading,
    error,
    updateDefaults: updateDefaultsMutation,
  };
}
