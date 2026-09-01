import { useMutation } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/utils/toast";
import { useAuth } from "@/components/AuthProvider";

export function useUserPasswordUpdate() {
  const { t } = useTranslation(["settings", "common"]);
  const { user } = useAuth();

  const updatePasswordMutation = useMutation({
    mutationFn: async (payload: {
      oldPassword: string;
      newPassword: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      await pb.collection("users").update(user.id, {
        oldPassword: payload.oldPassword,
        password: payload.newPassword,
        passwordConfirm: payload.newPassword,
      });
    },
    onSuccess: () => {
      toast.success(t("settings:profile.success_password_update"));
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  return updatePasswordMutation;
}
