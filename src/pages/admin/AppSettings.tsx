import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useTranslation } from "react-i18next";
import PageHeader from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useAppSettings } from "@/features/settings";
import { ReportOptionsSection } from "@/features/reports";
import { CompanyFinancialDefaultsSection } from "@/features/admin";

export default function AppSettings() {
  const { t, i18n } = useTranslation(["admin", "settings", "common", "navigation"]);
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
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin" aria-label={t("navigation:adminPanel")}>
                <ArrowLeft
                  className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <span>{t("admin:appSettings.title")}</span>
          </div>
        }
      />

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

      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin:appSettings.financialDefaultsTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("admin:appSettings.financialDefaultsDescription")}
          </p>
        </CardHeader>
        <CardContent>
          <CompanyFinancialDefaultsSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("settings:reportOptions.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("settings:reportOptions.description")}
          </p>
        </CardHeader>
        <CardContent>
          <ReportOptionsSection />
        </CardContent>
      </Card>
    </div>
  );
}
