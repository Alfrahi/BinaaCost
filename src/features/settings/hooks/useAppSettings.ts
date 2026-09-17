import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface AppSetting {
  key: string;
  value: { enabled: boolean };
  updated_at: string;
}

export function useAppSettings() {
  const { t } = useTranslation(["admin", "common"]);
  const queryClient = useQueryClient();
  const queryKey = ["app_settings", "user_signup"];

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<AppSetting | null>({
    queryKey,
    queryFn: async () => {
      try {
        const record = await pb
          .collection("app_settings")
          .getFirstListItem('key="user_signup"');
        return {
          key: record.key as string,
          value: record.value as { enabled: boolean },
          updated_at: record.updated,
        };
      } catch (e: any) {
        if (e?.status === 404) return null;
        throw e;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      let record;
      try {
        record = await pb
          .collection("app_settings")
          .getFirstListItem('key="user_signup"');
      } catch (e: any) {
        if (e?.status !== 404) throw e;
      }
      if (record) {
        await pb.collection("app_settings").update(record.id, {
          value: { enabled },
        });
      } else {
        await pb.collection("app_settings").create({
          key: "user_signup",
          value: { enabled },
        });
      }
    },
    onSuccess: () => {
      toast.success(t("admin:appSettings.successSaved"));
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error(t("admin:appSettings.errorSave", { message: err.message }));
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSetting: updateSettingMutation,
  };
}
