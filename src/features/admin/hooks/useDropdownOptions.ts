import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/shared/lib/pb-mapper";
import { toast } from "sonner";
import { WORLD_CURRENCIES } from "@/shared/lib/world-currencies";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/app/providers/AuthProvider";
import { handleError } from "@/shared/lib/toast";

export interface Option {
  id: string;
  value: string;
  category: string;
  translations?: Record<string, string>;
  rate?: number;
  numeric_value?: number;
}

export function useDropdownOptions(category: string) {
  const { t } = useTranslation(["common", "admin"]);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isCurrency = category === "currency";
  const isRiskProbability = category === "risk_probability";

  const queryKey = ["dropdown_settings", category];

  const {
    data: fetchedOptions = [],
    isLoading,
    error,
  } = useQuery<Option[]>({
    queryKey,
    queryFn: async () => {
      const records = await pb.collection("dropdown_settings").getList(1, 500, {
        filter: `category="${category}"`,
        sort: "value",
      });
      let data = mapRecords<Option>(records.items);

      if (isCurrency && data.length) {
        const rates = mapRecords<{ currency_code: string; rate_to_usd: number }>(
          await pb.collection("currency_rates").getFullList(),
        );
        const ratesMap = new Map(rates.map((r) => [r.currency_code, r.rate_to_usd]));
        data = data.map((o) => ({
          ...o,
          rate: ratesMap.get(o.value),
        }));
      }
      return data;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: {
      category: string;
      value: string;
      translation: string;
      rate?: number;
      numericValue?: number;
    }) => {
      const { category, value, translation, rate, numericValue } = payload;
      await pb.collection("dropdown_settings").create({
        category,
        value,
        translations: { en: value, ar: translation },
        numeric_value: numericValue,
      });
      if (isCurrency && rate !== undefined) {
        // upsert via getFirstListItem(create/update); admin-gated by rules
        try {
          const existing = await pb
            .collection("currency_rates")
            .getFirstListItem(`currency_code="${value}"`);
          await pb.collection("currency_rates").update(existing.id, { rate_to_usd: rate });
        } catch {
          await pb.collection("currency_rates").create({ currency_code: value, rate_to_usd: rate });
        }
      }
    },
    onSuccess: () => {
      toast.success(t("admin:dropdowns.success_add"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => handleError(err),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      category: string;
      oldValue: string;
      newValue: string;
      newTranslation: string;
      rate?: number;
      numericValue?: number;
    }) => {
      const { id, newValue, newTranslation, rate, numericValue } = payload;
      await pb.collection("dropdown_settings").update(id, {
        value: newValue,
        translations: { en: newValue, ar: newTranslation },
        numeric_value: numericValue,
      });
      if (isCurrency && rate !== undefined) {
        try {
          const existing = await pb
            .collection("currency_rates")
            .getFirstListItem(`currency_code="${newValue}"`);
          await pb.collection("currency_rates").update(existing.id, { rate_to_usd: rate });
        } catch {
          await pb.collection("currency_rates").create({ currency_code: newValue, rate_to_usd: rate });
        }
      }
    },
    onSuccess: () => {
      toast.success(t("admin:dropdowns.success_update"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => handleError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { id: string; category: string; value: string }) => {
      const { id, value } = payload;
      await pb.collection("dropdown_settings").delete(id);
      if (isCurrency) {
        try {
          const existing = await pb
            .collection("currency_rates")
            .getFirstListItem(`currency_code="${value}"`);
          await pb.collection("currency_rates").delete(existing.id);
        } catch {
          // currency rate may not exist; tolerate
        }
      }
    },
    onSuccess: () => {
      toast.success(t("admin:dropdowns.success_delete"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => handleError(err),
  });

  const getDisplayValue = (option: Option) => {
    if (isCurrency) {
      const found = WORLD_CURRENCIES.find((c) => c.code === option.value);
      return found ? `${found.code} - ${found.name}` : option.value;
    }
    return option.value;
  };

  return {
    options: fetchedOptions,
    isLoading,
    error,
    isCurrency,
    isRiskProbability,
    addOption: addMutation.mutateAsync,
    updateOption: updateMutation.mutateAsync,
    deleteOption: deleteMutation.mutateAsync,
    isAddingOption: addMutation.isPending,
    isUpdatingOption: updateMutation.isPending,
    isDeletingOption: deleteMutation.isPending,
    getDisplayValue,
  };
}
