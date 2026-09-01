import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProfile } from "@/hooks/useProfile";
import { Separator } from "@/components/ui/separator";
import { useUserEmailUpdate } from "@/hooks/useUserEmailUpdate";
import { useUserPasswordUpdate } from "@/hooks/useUserPasswordUpdate";

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

export default function ProfileSettings() {
  const { t } = useTranslation(["settings", "common"]);
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const updateEmailMutation = useUserEmailUpdate();
  const updatePasswordMutation = useUserPasswordUpdate();

  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
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

  const handleUpdatePassword = async () => {
    const result = passwordSchema.safeParse({
      newPassword,
      confirmNewPassword: confirmPassword,
    });
    if (!result.success) {
      const errorMsg = result.error.errors[0].message;
      toast.error(t(errorMsg));
      return;
    }

    await updatePasswordMutation.mutateAsync({
      oldPassword: currentPassword,
      newPassword,
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-8 text-sm">
      <form
        onSubmit={profileForm.handleSubmit(saveProfile)}
        className="space-y-4 max-w-md"
      >
        <div className="space-y-2">
          <Label htmlFor="first_name" className="text-sm">
            {t("settings:profile.firstName")}
          </Label>
          <Input
            id="first_name"
            {...profileForm.register("first_name")}
            aria-label={t("settings:profile.firstName")}
            className="text-sm"
          />
          {profileForm.formState.errors.first_name && (
            <p className="text-red-500 text-sm mt-1">
              {t(profileForm.formState.errors.first_name.message!)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name" className="text-sm">
            {t("settings:profile.lastName")}
          </Label>
          <Input
            id="last_name"
            {...profileForm.register("last_name")}
            aria-label={t("settings:profile.lastName")}
            className="text-sm"
          />
          {profileForm.formState.errors.last_name && (
            <p className="text-red-500 text-sm mt-1">
              {t(profileForm.formState.errors.last_name.message!)}
            </p>
          )}
        </div>

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

      <div className="space-y-4 max-w-md">
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

        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-sm">
            {t("settings:profile.newPassword")}
          </Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-label={t("settings:profile.newPassword")}
            className="text-sm"
          />
          {passwordSchema.safeParse({
            newPassword,
            confirmNewPassword: newPassword,
          }).error?.errors[0]?.message && (
            <p className="text-red-500 text-sm mt-1">
              {t(
                passwordSchema.safeParse({
                  newPassword,
                  confirmNewPassword: newPassword,
                }).error?.errors[0]?.message ?? "",
              )}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm">
            {t("settings:profile.confirmNewPassword")}
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-label={t("settings:profile.confirmNewPassword")}
            className="text-sm"
          />
          {passwordSchema.safeParse({
            newPassword,
            confirmNewPassword: confirmPassword,
          }).error?.errors[0]?.message && (
            <p className="text-red-500 text-sm mt-1">
              {t(
                passwordSchema.safeParse({
                  newPassword,
                  confirmNewPassword: confirmPassword,
                }).error?.errors[0]?.message ?? "",
              )}
            </p>
          )}
        </div>

        <Button
          onClick={handleUpdatePassword}
          disabled={updatePasswordMutation.isPending}
          className="text-sm"
        >
          {updatePasswordMutation.isPending
            ? t("common:saving")
            : t("settings:profile.updatePasswordButton")}
        </Button>
      </div>
    </div>
  );
}
