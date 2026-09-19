import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { pb } from "@/integrations/pocketbase/client";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";

export interface DropdownOption {
  value: string;
  label: string;
  numeric_value?: number | null;
}

export function useSettingsOptions(
  category: string,
  includeNumericValue = false,
) {
  const { i18n } = useTranslation();
  const { role } = useAuth();
  const { useQuery } = useOfflinePb();

  const queryKey = [
    "dropdown_settings",
    category,
    i18n.language,
    role,
    includeNumericValue,
  ];

  const { data, isLoading, error } = useQuery<DropdownOption[]>({
    queryKey,
    queryFn: async () => {
      const records = await pb.collection("dropdown_settings").getFullList({
        filter: `category="${category}"`,
        sort: "value",
      });
      return records.map((r) => {
        const tr = r.translations as Record<string, string> | null;
        return {
          value: r.value as string,
          label: tr?.[i18n.language] ?? (r.value as string),
          numeric_value: r.numeric_value as number | null,
        };
      });
    },
    staleTime: 1000 * 60 * 60,
  });

  return { options: data || [], isLoading, error };
}
