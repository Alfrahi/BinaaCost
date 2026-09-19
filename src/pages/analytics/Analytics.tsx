import PageHeader from "@/shared/components/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import LoadingState from "@/shared/components/ui/LoadingState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";

import { useAnalyticsData } from "@/features/analytics/hooks/useAnalyticsData";
import ProjectComparisonChart from "@/features/analytics/components/ProjectComparisonChart";

export default function Analytics() {
  const { t } = useTranslation(["pages", "common"]);
  const {
    filteredData,
    loading,
    error,
    availableCurrencies,
    selectedProjectId,
    setSelectedProjectId,
    selectedCurrency,
    setSelectedCurrency,
  } = useAnalyticsData();

  if (loading) {
    return <LoadingState className="h-64" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
        <AlertDescription className="text-sm">
          {t("pages:analytics.errorLoadingData")}: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("pages:analytics.title")} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">
            {t("pages:analytics.selectProject")}
          </Label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={t("pages:analytics.allProjects")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">
                {t("pages:analytics.allProjects")}
              </SelectItem>
              {filteredData?.projects.map((project) => (
                <SelectItem
                  key={project.id}
                  value={project.id}
                  className="text-sm"
                >
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">
            {t("pages:analytics.selectCurrency")}
          </Label>
          <Select
            value={selectedCurrency}
            onValueChange={setSelectedCurrency}
            disabled={selectedProjectId !== "all"}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map((currency) => (
                <SelectItem key={currency} value={currency} className="text-sm">
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredData?.missingRates && filteredData.missingRates.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-base">
            {t("pages:analytics.missingRatesBlockingTitle")}
          </AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>
              {t("pages:analytics.missingRatesBlockingDescription", {
                currencies: filteredData.missingRates.join(", "),
              })}
            </p>
            {filteredData.affectedProjects.length > 0 && (
              <p>
                {t("pages:analytics.affectedProjects", {
                  projects: filteredData.affectedProjects.join(", "),
                })}
              </p>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">
                {t("pages:analytics.provideRates")}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {filteredData && (
        <ProjectComparisonChart
          projects={filteredData.projects}
          displayCurrency={filteredData.displayCurrency}
        />
      )}
    </div>
  );
}
