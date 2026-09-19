import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { ProjectCostReport } from "@/features/projects/project-reports/components/ProjectCostReport";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { usePublicShare } from "@/features/projects/project-sharing/hooks/usePublicShare";
import { calculatePublicShareFinancials } from "@/features/projects/project-sharing/utils/publicShareFinancials";

export default function PublicShare() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const { t } = useTranslation([
    "public_share",
    "common",
    "project_detail",
    "project_reports",
  ]);

  const { format: _formatCurrency } = useCurrencyFormatter();
  const { formatDate } = useDateFormatter();

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
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
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
                {t("common:submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
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

  const financials = calculatePublicShareFinancials(
    project.financial_settings,
    materials,
    labor,
    equipment,
    additional,
  );

  const companyInfo = {
    name: t("public_share:sharedProject"),
    website: window.location.origin,
    logoUrl: "",
    email: "",
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{project.name}</CardTitle>
          <p className="text-muted-foreground">{project.description}</p>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            <strong>{t("project_detail:overview.type")}:</strong> {project.type}
          </p>
          <p>
            <strong>{t("project_detail:overview.location")}:</strong>{" "}
            {project.location || t("common:notSpecified")}
          </p>
          <p>
            <strong>{t("project_detail:overview.currency")}:</strong>{" "}
            {project.currency}
          </p>
          {expires_at && (
            <p className="text-muted-foreground mt-2">
              {t("public_share:linkExpires")}:{" "}
              {formatDate(expires_at, "dateTime")}
            </p>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
