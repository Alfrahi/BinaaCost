import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Globe, Printer, ShieldCheck } from "lucide-react";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import {
  ProjectCostReport,
  ClientProposalReport,
  usePublicShare,
  calculatePublicShareFinancials,
} from "@/features/projects";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useReportSettings } from "@/features/settings";

export default function PublicShare() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const { t, i18n } = useTranslation([
    "public_share",
    "common",
    "project_detail",
    "project_reports",
  ]);

  const [viewMode, setViewMode] = useState<"proposal" | "detailed">("proposal");
  const { format: _formatCurrency } = useCurrencyFormatter();
  const { formatDate } = useDateFormatter();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith("en") ? "ar" : "en";
    i18n.changeLanguage(newLang);
  };

  const { options: materialUnits } = useSettingsOptions("material_unit");
  const { options: periodUnits } = useSettingsOptions("equipment_period_unit");
  const { options: additionalCategories } = useSettingsOptions(
    "additional_cost_category",
  );
  const { options: riskProbabilities } = useSettingsOptions("risk_probability");

  const allSettingsOptions = useMemo(
    () => ({
      material_unit: materialUnits,
      equipment_period_unit: periodUnits,
      additional_cost_category: additionalCategories,
      risk_probability: riskProbabilities,
    }),
    [materialUnits, periodUnits, additionalCategories, riskProbabilities],
  );

  const {
    password,
    setPassword,
    isAuthenticated,
    authError,
    shareData,
    isLoading,
    error,
    handlePasswordSubmit,
  } = usePublicShare(accessToken);

  const { reportSettings } = useReportSettings();

  if (isLoading) {
    return <LoadingState className="min-h-screen" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (
    shareData &&
    "password_protected" in shareData &&
    shareData.password_protected &&
    !isAuthenticated
  ) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="flex justify-end p-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-sm font-medium"
            aria-label={t("common:switchLanguage")}
          >
            <Globe className="h-4 w-4 me-1.5" />
            {i18n.language.startsWith("en")
              ? t("common:languageNameAr")
              : t("common:languageNameEn")}
          </Button>
        </header>
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl">
                {t("public_share:passwordRequired")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Label htmlFor="password">
                  {t("public_share:enterPassword")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("public_share:passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {authError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription className="text-sm">
                      {authError}
                    </AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full">
                  {t("public_share:access")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!shareData || !("project" in shareData) || !shareData.project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("public_share:invalidLink")}</AlertTitle>
          <AlertDescription>
            {t("public_share:linkNotFoundOrExpired")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const {
    project,
    materials,
    labor,
    equipment,
    additional,
    risks,
    groups,
    expires_at,
  } = shareData;

  const financials =
    shareData.financials ||
    calculatePublicShareFinancials(
      project.financial_settings,
      materials,
      labor,
      equipment,
      additional,
      risks,
    );

  const companyInfo = {
    name: reportSettings.company_name || t("public_share:sharedProject"),
    website: reportSettings.company_website || window.location.origin,
    logoUrl: reportSettings.company_logo_url || "",
    email: reportSettings.company_email || "",
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      {/* Top action bar - hidden on print */}
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 shadow-xs print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs">
              {project.name}
            </span>
            <Badge variant="secondary" className="gap-1 text-xs font-normal">
              <ShieldCheck className="h-3 w-3 text-primary" />
              {t("public_share:readOnlyView")}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Tabs
              value={viewMode}
              onValueChange={(val) => setViewMode(val as "proposal" | "detailed")}
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="proposal" className="text-xs px-2.5 py-1">
                  {t("public_share:proposalView")}
                </TabsTrigger>
                <TabsTrigger value="detailed" className="text-xs px-2.5 py-1">
                  {t("public_share:detailedView")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-xs font-medium h-8 px-2.5"
              aria-label={t("common:switchLanguage")}
            >
              <Globe className="h-3.5 w-3.5 me-1.5" />
              {i18n.language.startsWith("en")
                ? t("common:languageNameAr")
                : t("common:languageNameEn")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs h-8 px-2.5"
            >
              <Printer className="h-3.5 w-3.5 me-1.5" />
              {t("public_share:print")}
            </Button>
          </div>
        </div>
      </header>

      {/* Expiry Banner */}
      {expires_at && (
        <div className="mx-auto max-w-5xl px-4 pt-3 print:hidden">
          <div className="rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
            {t("public_share:linkExpires")}: {formatDate(expires_at, "dateTime")}
          </div>
        </div>
      )}

      {/* Main Report View */}
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="rounded-lg border border-border bg-card shadow-xs print:border-none print:shadow-none">
          {viewMode === "proposal" ? (
            <ClientProposalReport
              project={project}
              financials={financials}
              companyInfo={companyInfo}
              terms={reportSettings.default_terms || t("project_reports:defaultTerms")}
              preparedBy={t("public_share:sharedByOwner")}
              clientName=""
            />
          ) : (
            <ProjectCostReport
              project={project}
              financials={financials}
              materials={materials}
              labor={labor}
              equipment={equipment}
              additional={additional}
              risks={risks}
              groups={groups}
              companyInfo={companyInfo}
              preparedBy={t("public_share:sharedByOwner")}
              allSettingsOptions={allSettingsOptions}
            />
          )}
        </div>
      </main>
    </div>
  );
}
