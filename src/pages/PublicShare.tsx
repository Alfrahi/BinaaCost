import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { calculateProjectFinancials } from "@/shared/logic/financials";
import { calculateItemCost } from "@/shared/logic/shared";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { ProjectCostReport } from "@/features/reports/components/ProjectCostReport";
import { useSettingsOptions } from "@/features/admin/hooks/useSettingsOptions";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/types/project-items";
import { PublicShareResponse } from "@/types/project";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

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

  type QueryResult =
    | PublicShareResponse
    | { password_protected: true }
    | { error: string };

  const [shareData, setShareData] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const doFetch = useCallback(
    async (pw: string): Promise<QueryResult> => {
      if (!accessToken) throw new Error("Access token is missing.");
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
        if (msg?.startsWith("Incorrect password"))
          return { password_protected: true };
        throw new Error(msg || t("public_share:linkNotFoundOrExpired"));
      }
      throw new Error(t("public_share:linkNotFoundOrExpired"));
    },
    [accessToken, t],
  );

  // Probe once: empty password tells us whether this is a gated link.
  useEffect(() => {
    let alive = true;
    doFetch("")
      .then((data) => {
        if (!alive) return;
        if ("password_protected" in data) {
          setShareData(data);
        } else {
          setShareData(data);
          setIsAuthenticated(true);
        }
      })
      .catch((e) => alive && setError(e as Error))
      .finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
    };
  }, [doFetch]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const data = await doFetch(password);
      if ("password_protected" in data) {
        setAuthError(t("public_share:incorrectPassword"));
        setPassword("");
        return;
      }
      setShareData(data);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : t("public_share:invalidLink"),
      );
    }
  };

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
