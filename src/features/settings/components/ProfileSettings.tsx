import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProfile } from "@/features/settings/hooks/useProfile";
import { Separator } from "@/shared/components/ui/separator";
import { useUserEmailUpdate } from "@/features/settings/hooks/useUserEmailUpdate";
import { useUserPasswordUpdate } from "@/features/settings/hooks/useUserPasswordUpdate";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

const profileSchema = z.object({
  first_name: z.string().min(1, "settings:profile.firstNameRequired"),
  last_name: z.string().min(1, "settings:profile.lastNameRequired"),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "settings:profile.passwordMinLength"),
    confirmNewPassword: z.string().min(8, "settings:profile.passwordMinLength"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "settings:profile.passwordMismatch",
    path: ["confirmNewPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfileSettings() {
  const { t } = useTranslation(["settings", "common"]);
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const updateEmailMutation = useUserEmailUpdate();
  const updatePasswordMutation = useUserPasswordUpdate();

  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    mode: "onChange",
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
      });
    }
  }, [profile, profileForm]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  const saveProfile = async (values: ProfileForm) => {
    if (!profile?.id) {
      toast.error(
        t("common:error") + ": " + t("settings:profile.profileNotFound"),
      );
      return;
    }
    await updateProfile.mutateAsync({
      id: profile.id,
      first_name: values.first_name,
      last_name: values.last_name,
    });
  };

  const handleUpdateEmail = async () => {
    await updateEmailMutation.mutateAsync(email);
  };

  const handleUpdatePassword = async (values: PasswordForm) => {
    await updatePasswordMutation.mutateAsync({
      oldPassword: currentPassword,
      newPassword: values.newPassword,
    });
    setCurrentPassword("");
    passwordForm.reset();
  };

  return (
    <div className="space-y-8 text-sm">
      <Form {...profileForm}>
        <form
          onSubmit={profileForm.handleSubmit(saveProfile)}
          className="space-y-4 max-w-md"
        >
          <FormField
            control={profileForm.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("settings:profile.firstName")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-label={t("settings:profile.firstName")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={profileForm.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("settings:profile.lastName")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    aria-label={t("settings:profile.lastName")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={updateProfile.isPending}
            className="text-sm"
          >
            {updateProfile.isPending
              ? t("common:saving")
              : t("settings:profile.saveButton")}
          </Button>
        </form>
      </Form>

      <Separator />

      <div className="space-y-4 max-w-md">
        <Label htmlFor="email" className="text-sm">
          {t("settings:profile.emailTitle")}
        </Label>
        <div className="flex gap-2">
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label={t("settings:profile.emailTitle")}
            className="text-sm"
          />
          <Button
            onClick={handleUpdateEmail}
            disabled={updateEmailMutation.isPending}
            className="text-sm"
          >
            {updateEmailMutation.isPending
              ? t("common:saving")
              : t("settings:profile.updateEmailButton")}
          </Button>
        </div>
      </div>

      <Separator />

      <Form {...passwordForm}>
        <form
          onSubmit={passwordForm.handleSubmit(handleUpdatePassword)}
          className="space-y-4 max-w-md"
        >
          <Label className="text-sm">{t("settings:profile.passwordTitle")}</Label>

          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm">
              {t("settings:profile.currentPassword")}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              aria-label={t("settings:profile.currentPassword")}
              className="text-sm"
            />
          </div>

          <FormField
            control={passwordForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("settings:profile.newPassword")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    aria-label={t("settings:profile.newPassword")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={passwordForm.control}
            name="confirmNewPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("settings:profile.confirmNewPassword")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    aria-label={t("settings:profile.confirmNewPassword")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={updatePasswordMutation.isPending}
            className="text-sm"
          >
            {updatePasswordMutation.isPending
              ? t("common:saving")
              : t("settings:profile.updatePasswordButton")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
