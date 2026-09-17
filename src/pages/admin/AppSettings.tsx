import { useCallback } from "react";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useTranslation } from "react-i18next";
import PageHeader from "@/shared/components/PageHeader";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useAppSettings } from "@/features/settings/hooks/useAppSettings";

export default function AppSettings() {
  const { t } = useTranslation(["admin", "common"]);
  const { settings, isLoading, error, updateSetting } = useAppSettings();

  const signupEnabled = settings?.value?.enabled || false;

  const handleToggleSignup = useCallback(async () => {
    const newValue = !signupEnabled;
    updateSetting.mutate(newValue);
  }, [signupEnabled, updateSetting]);

  if (isLoading) {
    return <LoadingState className="h-64" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
        <AlertDescription className="text-sm">{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <PageHeader title={t("admin:appSettings.title")} />

      <Card>
        <CardHeader>
          <CardTitle>
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
