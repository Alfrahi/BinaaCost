import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/shared/lib/toast";

export function useUserEmailUpdate() {
  const { t } = useTranslation(["settings", "common"]);
  const queryClient = useQueryClient();

  const updateEmailMutation = useMutation({
    mutationFn: async (newEmail: string) => {
      // PocketBase sends a confirmation link to the new address; the change
      // only applied after the user confirms. Surface that to the caller.
      await pb.collection("users").requestEmailChange(newEmail);
      return { pendingConfirmation: true };
    },
    onSuccess: () => {
      // Reset to re-check email after confirmation
      pb.authStore.clear();
      toast.success(t("settings:profile.info_email_update"));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  return updateEmailMutation;
}
