import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/shared/lib/toast";

export interface ReportSettingsValue {
  company_name: string;
  company_website: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  company_logo_url?: string;
  default_terms?: string;
}

export const DEFAULT_REPORT_SETTINGS: ReportSettingsValue = {
  company_name: "",
  company_website: "",
  company_email: "",
  company_phone: "",
  company_address: "",
  company_logo_url: "",
  default_terms: "",
};

export function useReportSettings() {
  const { t } = useTranslation(["settings", "common"]);
  const queryClient = useQueryClient();
  const queryKey = ["app_settings", "report_settings"];

  const {
    data: reportSettings = DEFAULT_REPORT_SETTINGS,
    isLoading,
    error,
  } = useQuery<ReportSettingsValue>({
    queryKey,
    queryFn: async () => {
      try {
        const record = await pb
          .collection("app_settings")
          .getFirstListItem('key="report_settings"');
        return {
          ...DEFAULT_REPORT_SETTINGS,
          ...(record.value as Partial<ReportSettingsValue>),
        };
      } catch (e: any) {
        if (e?.status === 404) return DEFAULT_REPORT_SETTINGS;
        throw e;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateReportSettingsMutation = useMutation({
    mutationFn: async (newValue: Partial<ReportSettingsValue>) => {
      let record;
      try {
        record = await pb
          .collection("app_settings")
          .getFirstListItem('key="report_settings"');
      } catch (e: any) {
        if (e?.status !== 404) throw e;
      }

      const mergedValue: ReportSettingsValue = {
        ...DEFAULT_REPORT_SETTINGS,
        ...(record ? (record.value as ReportSettingsValue) : {}),
        ...newValue,
      };

      if (record) {
        return await pb.collection("app_settings").update(record.id, {
          value: mergedValue,
        });
      } else {
        return await pb.collection("app_settings").create({
          key: "report_settings",
          value: mergedValue,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(t("settings:reportOptions.success_saved"));
    },
    onError: (err: any) => {
      handleError(err);
    },
  });

  return {
    reportSettings,
    isLoading,
    error,
    updateReportSettings: updateReportSettingsMutation,
  };
}
