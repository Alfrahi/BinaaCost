import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { calculateProjectFinancials } from "@/logic/financials";
import { calculateItemCost } from "@/logic/shared";
import { format } from "date-fns";
import { ProjectCostReport } from "@/components/reports/ProjectCostReport";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/types/project-items";
import { PublicShareResponse } from "@/types/project";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PublicShare() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const { t } = useTranslation([
    "public_share",
    "common",
    "project_detail",
    "project_reports",
  ]);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { format: _formatCurrency } = useCurrencyFormatter();

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

  type QueryResult =
    | PublicShareResponse
    | { password_protected: true }
    | { error: string };

  const {
    data: shareData,
    isLoading,
    error,
  } = useQuery<QueryResult, Error>({
    queryKey: ["publicShare", accessToken, isAuthenticated],
    queryFn: async () => {
      if (!accessToken) throw new Error("Access token is missing.");

      const fetchShare = async (pw: string): Promise<QueryResult> => {
        const base = import.meta.env.VITE_POCKETBASE_URL;
        const res = await fetch(`${base}/api/share/${accessToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw }),
        });
        if (res.ok) return (await res.json()) as PublicShareResponse;
        if (res.status === 403) {
          const body = await res.json().catch(() => null);
          const msg = body?.message as string | undefined;
          if (msg === "Incorrect password") return { password_protected: true };
          throw new Error(msg || t("public_share:linkNotFoundOrExpired"));
        }
        throw new Error(t("public_share:linkNotFoundOrExpired"));
      };

      if (!isAuthenticated) {
        const linkCheck = await fetchShare("");
        if ("password_protected" in linkCheck) return linkCheck;
        setIsAuthenticated(true);
        return linkCheck;
      }

      const data = await fetchShare(password);
      if ("password_protected" in data) {
        setIsAuthenticated(false);
        return data;
      }
      return data;
    },
    enabled: !!accessToken,
    retry: false,
  });

  useEffect(() => {
    if (
      shareData &&
      "password_protected" in shareData &&
      shareData.password_protected === false
    ) {
      setIsAuthenticated(true);
    }
  }, [shareData]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
                <p className="text-destructive text-sm">{authError}</p>
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

  const materialsTotal = materials.reduce(
    (sum: number, item: MaterialItem) =>
      sum + calculateItemCost.material(item.quantity, item.unit_price),
    0,
  );
  const laborTotal = labor.reduce(
    (sum: number, item: LaborItem) =>
      sum +
      calculateItemCost.labor(
        item.number_of_workers,
        item.daily_rate,
        item.total_days,
      ),
    0,
  );
  const equipmentTotal = equipment.reduce(
    (sum: number, item: EquipmentItem) =>
      sum +
      calculateItemCost.equipment({
        quantity: item.quantity,
        costPerPeriod: item.cost_per_period,
        usageDuration: item.usage_duration,
        maintenanceCost: item.maintenance_cost,
        fuelCost: item.fuel_cost,
      }).totalCost,
    0,
  );
  const additionalTotal = additional.reduce(
    (sum: number, item: AdditionalCostItem) => sum + item.amount,
    0,
  );

  const financials = calculateProjectFinancials(
    { materialsTotal, laborTotal, equipmentTotal, additionalTotal },
    project.financial_settings,
  );

  const companyInfo = {
    name: t("public_share:sharedProject"),
    website: window.location.origin,
    logoUrl: "",
    email: "",
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
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
              {format(new Date(expires_at), "MMM dd, yyyy HH:mm")}
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
