import { useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/PageHeader";
import { Loader2 } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function AppSettings() {
  const { t } = useTranslation(["admin", "common"]);
  const { settings, isLoading, error, updateSetting } = useAppSettings();

  const signupEnabled = settings?.value?.enabled || false;

  const handleToggleSignup = useCallback(async () => {
    const newValue = !signupEnabled;
    updateSetting.mutate(newValue);
  }, [signupEnabled, updateSetting]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">
        {t("common:error")}: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <PageHeader title={t("admin:appSettings.title")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("admin:appSettings.userSignup")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="signup-enabled">
                {t("admin:appSettings.allowUserSignups")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("admin:appSettings.allowUserSignupsDescription")}
              </p>
            </div>
            <Switch
              id="signup-enabled"
              checked={signupEnabled}
              onCheckedChange={handleToggleSignup}
              disabled={updateSetting.isPending}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {signupEnabled
              ? t("admin:appSettings.signupEnabled")
              : t("admin:appSettings.signupDisabled")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
