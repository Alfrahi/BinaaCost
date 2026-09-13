import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Play,
  Info,
  X,
  Settings,
} from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useAuth } from "@/components/AuthProvider";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import ReactECharts from "echarts-for-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, getIconMarginClass } from "@/lib/utils";
import {
  Scenario,
  ScenarioRuleFormValues,
  ScenarioFormValues,
  scenarioFormSchema,
} from "@/types/scenario-analysis";
import { useScenarioManager } from "@/hooks/useScenarioManager";
import { useProjectSimulator } from "@/hooks/useProjectSimulator";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { FinancialSummary } from "@/logic/financials";

const COLORS = ["#60A5FA", "#34D399"];

export function ScenarioAnalysisTab({
  projectId,
  risks: projectRisks,
  currency,
  canEdit,
  additionalCategories,
}: {
  projectId: string;
  risks: any[];
  currency: string;
  canEdit: boolean;
  additionalCategories: { value: string; label: string }[];
  riskProbabilities: { value: string; label: string }[];
}) {
  const { t, i18n } = useTranslation([
    "scenario_analysis",
    "common",
    "project_detail",
    "project_tabs",
    "project_risk",
  ]);
  const { user } = useAuth();
  const { format } = useCurrencyFormatter();

  const {
    scenarios,
    isLoadingScenarios,
    addScenario,
    updateScenario,
    deleteScenario,
    isAddingScenario,
    isUpdatingScenario,
    isDeletingScenario,
    formatRulesForDb,
    formatRulesForForm,
  } = useScenarioManager();

  const {
    simulationResult,
    isSimulating,
    runSimulation,
    clearSimulationResult,
  } = useProjectSimulator();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  const [isManageScenariosOpen, setIsManageScenariosOpen] = useState(false);
  const [isScenarioFormOpen, setIsScenarioFormOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [deleteTargetScenario, setDeleteTargetScenario] =
    useState<Scenario | null>(null);

  const scenarioForm = useForm<ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: {
      name: "",
      description: "",
      is_public: false,
      impact_rules: [],
    },
  });

  const handleRunSimulation = useCallback(async () => {
    if (!selectedScenarioId) {
      toast.error(t("selectScenarioToRun"));
      return;
    }
    const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);
    if (!selectedScenario) {
      toast.error(t("scenarioNotFound"));
      return;
    }
    await runSimulation(projectId, selectedScenario);
  }, [selectedScenarioId, scenarios, projectId, runSimulation, t]);

  const handleScenarioFormSubmit = useCallback(
    async (values: ScenarioFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        is_public: values.is_public,
        impact_rules: formatRulesForDb(values.impact_rules),
      };
      if (editingScenario) {
        await updateScenario({
          id: editingScenario.id,
          ...payload,
        });
      } else {
        await addScenario(payload);
      }
      setIsScenarioFormOpen(false);
      setEditingScenario(null);
      scenarioForm.reset();
    },
    [
      editingScenario,
      addScenario,
      updateScenario,
      scenarioForm,
      formatRulesForDb,
    ],
  );

  const openScenarioForm = useCallback(
    (scenario: Scenario | null) => {
      setEditingScenario(scenario);
      if (scenario) {
        scenarioForm.reset({
          name: scenario.name,
          description: scenario.description || "",
          is_public: scenario.is_public,
          impact_rules: formatRulesForForm(scenario.impact_rules),
        });
      } else {
        scenarioForm.reset({
          name: "",
          description: "",
          is_public: false,
          impact_rules: [],
        });
      }
      setIsScenarioFormOpen(true);
    },
    [scenarioForm, formatRulesForForm],
  );

  const closeScenarioForm = useCallback(() => {
    setIsScenarioFormOpen(false);
    setEditingScenario(null);
    scenarioForm.reset();
  }, [scenarioForm]);

  const handleAddRule = useCallback(() => {
    const currentRules = scenarioForm.getValues("impact_rules");
    scenarioForm.setValue("impact_rules", [
      ...currentRules,
      {
        item_type: "materials",
        field: "unit_price",
        adjustment_type: "percentage_increase",
        value: 10,
      },
    ]);
  }, [scenarioForm]);

  const handleRemoveRule = useCallback(
    (index: number) => {
      const currentRules = scenarioForm.getValues("impact_rules");
      scenarioForm.setValue(
        "impact_rules",
        currentRules.filter((_, i) => i !== index),
      );
    },
    [scenarioForm],
  );

  const originalFinancials: FinancialSummary | undefined = simulationResult
    ?.original.financials as FinancialSummary;
  const simulatedFinancials: FinancialSummary | undefined = simulationResult
    ?.simulated.financials as FinancialSummary;

  const chartOptions = useMemo(() => {
    if (!simulationResult || !originalFinancials || !simulatedFinancials)
      return {};

    const categories = [
      t("project_tabs:materials"),
      t("project_tabs:labor"),
      t("project_tabs:equipment"),
      t("project_tabs:additional"),
      t("project_detail:profit_pricing.overhead"),
      t("project_detail:profit_pricing.generalContingency"),
      t("project_detail:profit_pricing.markup"),
      t("project_detail:profit_pricing.taxes"),
    ];

    const originalData = [
      originalFinancials.materialsTotal,
      originalFinancials.laborTotal,
      originalFinancials.equipmentTotal,
      originalFinancials.additionalTotal,
      originalFinancials.overheadAmount,
      originalFinancials.contingencyAmount,
      originalFinancials.markupAmount,
      originalFinancials.taxAmount,
    ];

    const simulatedData = [
      simulatedFinancials.materialsTotal,
      simulatedFinancials.laborTotal,
      simulatedFinancials.equipmentTotal,
      simulatedFinancials.additionalTotal,
      simulatedFinancials.overheadAmount,
      simulatedFinancials.contingencyAmount,
      simulatedFinancials.markupAmount,
      simulatedFinancials.taxAmount,
    ];

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          let res = `<b>${params[0].name}</b><br/>`;
          params.forEach((item: any) => {
            res += `${item.marker} ${item.seriesName}: ${format(item.value, currency)}<br/>`;
          });
          return res;
        },
      },
      legend: {
        data: [t("original"), t("simulated")],
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        top: "10%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) =>
            format(value, currency, { compact: true }),
        },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          formatter: (value: string) =>
            value.length > 15 ? value.substring(0, 15) + "..." : value,
          interval: 0,
          rotate: i18n.dir() === "rtl" ? 45 : 0,
        },
      },
      series: [
        {
          name: t("original"),
          type: "bar",
          stack: "total",
          data: originalData,
          itemStyle: { color: COLORS[0] },
        },
        {
          name: t("simulated"),
          type: "bar",
          stack: "total",
          data: simulatedData,
          itemStyle: { color: COLORS[1] },
        },
      ],
    };
  }, [
    simulationResult,
    originalFinancials,
    simulatedFinancials,
    currency,
    format,
    t,
    i18n,
  ]);

  const itemTypeOptions = useMemo(
    () => [
      { value: "materials", label: t("project_tabs:materials") },
      { value: "labor", label: t("project_tabs:labor") },
      { value: "equipment", label: t("project_tabs:equipment") },
      { value: "additional", label: t("project_tabs:additional") },
      { value: "risks", label: t("realizeRisk") },
      { value: "financial_settings", label: t("financialSettings") },
    ],
    [t],
  );

  const getFieldOptions = useCallback(
    (itemType: ScenarioRuleFormValues["item_type"]) => {
      switch (itemType) {
        case "materials":
          return [
            {
              value: "unit_price",
              label: t("project_materials:columns.unitPrice"),
            },
          ];
        case "labor":
          return [
            {
              value: "daily_rate",
              label: t("project_labor:columns.dailyRate"),
            },
            {
              value: "total_days",
              label: t("project_labor:columns.totalDays"),
            },
          ];
        case "equipment":
          return [
            {
              value: "cost_per_period",
              label: t("project_equipment:columns.costPerPeriod"),
            },
            {
              value: "maintenance_cost",
              label: t("project_equipment:columns.maintenance"),
            },
            { value: "fuel_cost", label: t("project_equipment:columns.fuel") },
            {
              value: "usage_duration",
              label: t("project_equipment:columns.usageDuration"),
            },
          ];
        case "additional":
          return [
            { value: "amount", label: t("project_additional:columns.amount") },
          ];
        case "risks":
          return [
            { value: "realize_risk_impact", label: t("realizeRiskImpact") },
          ];
        case "financial_settings":
          return [
            {
              value: "overhead_percent",
              label: t("project_detail:profit_pricing.overhead"),
            },
            {
              value: "markup_percent",
              label: t("project_detail:profit_pricing.markup"),
            },
            {
              value: "tax_percent",
              label: t("project_detail:profit_pricing.taxes"),
            },
            {
              value: "contingency_percent",
              label: t("project_detail:profit_pricing.generalContingency"),
            },
          ];
        default:
          return [];
      }
    },
    [t],
  );

  const getAdjustmentTypeOptions = useCallback(
    (itemType: ScenarioRuleFormValues["item_type"], field: string) => {
      if (itemType === "risks" && field === "realize_risk_impact") {
        return [{ value: "by_id", label: t("byId") }];
      }
      if (field === "total_days" || field === "usage_duration") {
        return [{ value: "fixed_increase", label: t("fixedIncrease") }];
      }
      return [
        { value: "percentage_increase", label: t("percentageIncrease") },
        { value: "fixed_increase", label: t("fixedIncrease") },
      ];
    },
    [t],
  );

  const projectRiskOptions = useMemo(
    () => projectRisks.map((r) => ({ value: r.id, label: r.description })),
    [projectRisks],
  );

  return (
    <div className="space-y-6 text-sm">
      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">{t("title")}</h3>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsManageScenariosOpen(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t("manageScenarios")}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedScenarioId || ""}
            onValueChange={setSelectedScenarioId}
            disabled={isLoadingScenarios || isSimulating}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder={t("selectScenario")} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingScenarios ? (
                <SelectItem value="loading" disabled className="text-sm">
                  {t("common:loading")}
                </SelectItem>
              ) : scenarios.length === 0 ? (
                <SelectItem value="no-scenarios" disabled className="text-sm">
                  {t("noScenarios")}
                </SelectItem>
              ) : (
                scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-sm">
                    {s.name} {s.is_public && `(${t("public")})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button
              onClick={handleRunSimulation}
              disabled={!selectedScenarioId || isSimulating}
              className="text-sm w-full sm:w-auto"
            >
              {isSimulating ? (
                <>
                  <Loader2
                    className={cn(
                      "w-4 h-4",
                      getIconMarginClass(),
                      "animate-spin",
                    )}
                  />
                  {t("common:running")}
                </>
              ) : (
                <>
                  <Play className={cn("w-4 h-4", getIconMarginClass())} />
                  {t("runSimulation")}
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {simulationResult && originalFinancials && simulatedFinancials && (
        <Card className="p-4 sm:p-6 border-2 border-border shadow-md">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">{t("simulationResults")}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSimulationResult}
              aria-label={t("common:close")}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <h4 className="font-semibold text-base mb-2">
                {t("financialSummary")}
              </h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("category")}
                      </th>
                      <th className="px-4 py-2 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("original")}
                      </th>
                      <th className="px-4 py-2 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("simulated")}
                      </th>
                      <th className="px-4 py-2 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("difference")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {[
                      {
                        label: t("project_tabs:materials"),
                        original: originalFinancials.materialsTotal,
                        simulated: simulatedFinancials.materialsTotal,
                      },
                      {
                        label: t("project_tabs:labor"),
                        original: originalFinancials.laborTotal,
                        simulated: simulatedFinancials.laborTotal,
                      },
                      {
                        label: t("project_tabs:equipment"),
                        original: originalFinancials.equipmentTotal,
                        simulated: simulatedFinancials.equipmentTotal,
                      },
                      {
                        label: t("project_tabs:additional"),
                        original: originalFinancials.additionalTotal,
                        simulated: simulatedFinancials.additionalTotal,
                      },
                      {
                        label: t(
                          "project_detail:profit_pricing.totalDirectCosts",
                        ),
                        original: originalFinancials.directCosts,
                        simulated: simulatedFinancials.directCosts,
                        isBold: true,
                      },
                      {
                        label: t("project_detail:profit_pricing.overhead"),
                        original: originalFinancials.overheadAmount,
                        simulated: simulatedFinancials.overheadAmount,
                      },
                      {
                        label: t(
                          "project_detail:profit_pricing.generalContingency",
                        ),
                        original: originalFinancials.contingencyAmount,
                        simulated: simulatedFinancials.contingencyAmount,
                      },
                      {
                        label: t("project_detail:profit_pricing.primeCost"),
                        original: originalFinancials.primeCost,
                        simulated: simulatedFinancials.primeCost,
                        isBold: true,
                      },
                      {
                        label: t("project_detail:profit_pricing.markup"),
                        original: originalFinancials.markupAmount,
                        simulated: simulatedFinancials.markupAmount,
                      },
                      {
                        label: t(
                          "project_detail:profit_pricing.subtotalBeforeTax",
                        ),
                        original: originalFinancials.bidPrice,
                        simulated: simulatedFinancials.bidPrice,
                        isBold: true,
                      },
                      {
                        label: t("project_detail:profit_pricing.taxes"),
                        original: originalFinancials.taxAmount,
                        simulated: simulatedFinancials.taxAmount,
                      },
                      {
                        label: t(
                          "project_detail:profit_pricing.finalProjectTotal",
                        ),
                        original: originalFinancials.grandTotal,
                        simulated: simulatedFinancials.grandTotal,
                        isBold: true,
                        isPrimary: true,
                      },
                    ].map((row, index) => (
                      <tr
                        key={index}
                        className={cn(
                          row.isPrimary
                            ? "bg-muted"
                            : row.isBold && "bg-muted",
                          row.isPrimary
                            ? "font-bold text-primary"
                            : row.isBold && "font-semibold",
                        )}
                      >
                        <td
                          className={cn(
                            "px-4 py-2 text-sm",
                            row.isBold && "font-semibold",
                            "text-start",
                          )}
                        >
                          {row.label}
                        </td>
                        <td className="px-4 py-2 text-end text-sm">
                          {format(row.original, currency)}
                        </td>
                        <td className="px-4 py-2 text-end text-sm">
                          {format(row.simulated, currency)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2 text-end text-sm",
                            row.simulated - row.original > 0
                              ? "text-destructive"
                              : "text-success",
                          )}
                        >
                          {format(row.simulated - row.original, currency, {
                            showSign: true,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-base mb-2">
                {t("costComparison")}
              </h4>
              <div className="h-[400px] w-full">
                {/* Force LTR on chart canvas; ECharts has no native RTL support.
                    Wrapping in dir="ltr" prevents browser RTL mirroring of the canvas.
                    Axis labels and legend use translated keys, so they render correctly.
                    Y-axis rotation for RTL is handled inside chartOptions. */}
                <div dir="ltr">
                  <ReactECharts
                    option={chartOptions}
                    style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "canvas" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isManageScenariosOpen}
        onOpenChange={setIsManageScenariosOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("manageScenarios")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {canEdit && (
              <Button
                onClick={() => openScenarioForm(null)}
                className="text-sm"
              >
                <Plus className={cn("w-4 h-4", getIconMarginClass())} />
                {t("createNewScenario")}
              </Button>
            )}
            <h4 className="font-semibold text-base">
              {t("existingScenarios")}
            </h4>
            {isLoadingScenarios ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : scenarios.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                {t("noScenarios")}
              </p>
            ) : (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="divide-y divide-border">
                  {scenarios.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 hover:bg-muted"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {s.name} {s.is_public && `(${t("public")})`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.description || t("common:noDescription")}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {canEdit && s.user_id === user?.id && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openScenarioForm(s)}
                              aria-label={`${t("common:edit")} ${s.name}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTargetScenario(s)}
                              aria-label={`${t("common:delete")} ${s.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManageScenariosOpen(false)}
              className="text-sm"
            >
              {t("common:close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScenarioFormOpen} onOpenChange={closeScenarioForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editingScenario ? t("editScenario") : t("createScenario")}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={scenarioForm.handleSubmit(handleScenarioFormSubmit)}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="scenario-name" className="text-sm">
                {t("name")}
              </Label>
              <Input
                id="scenario-name"
                {...scenarioForm.register("name")}
                placeholder={t("namePlaceholder")}
                className="text-sm"
              />
              {scenarioForm.formState.errors.name && (
                <p className="text-destructive text-xs mt-1">
                  {t(scenarioForm.formState.errors.name.message!)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-description" className="text-sm">
                {t("description")}
              </Label>
              <Textarea
                id="scenario-description"
                {...scenarioForm.register("description")}
                placeholder={t("descriptionPlaceholder")}
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                {...scenarioForm.register("is_public")}
                className="h-4 w-4 text-primary border-input rounded focus:ring-primary"
              />
              <Label htmlFor="is_public" className="text-sm">
                {t("makePublic")}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p>{t("publicTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <h4 className="font-semibold text-base mt-6">{t("impactRules")}</h4>
            {scenarioForm.formState.errors.impact_rules && (
              <p className="text-destructive text-xs mt-1">
                {t(scenarioForm.formState.errors.impact_rules.message!)}
              </p>
            )}
            <div className="space-y-4 border p-3 rounded-md bg-muted">
              {scenarioForm.watch("impact_rules").map((rule, index) => (
                <Card key={index} className="p-3 space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 end-2 h-6 w-6 text-destructive"
                    onClick={() => handleRemoveRule(index)}
                    aria-label={t("common:remove")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">{t("itemType")}</Label>
                      <Select
                        value={rule.item_type}
                        onValueChange={(
                          val: ScenarioRuleFormValues["item_type"],
                        ) => {
                          scenarioForm.setValue(
                            `impact_rules.${index}.item_type`,
                            val,
                          );
                          const fieldOptions = getFieldOptions(val);
                          const defaultField = fieldOptions[0]?.value || "";
                          scenarioForm.setValue(
                            `impact_rules.${index}.field`,
                            defaultField,
                          );
                          scenarioForm.setValue(
                            `impact_rules.${index}.adjustment_type`,
                            (getAdjustmentTypeOptions(val, defaultField)[0]
                              ?.value as ScenarioRuleFormValues["adjustment_type"]) ||
                              "percentage_increase",
                          );
                          scenarioForm.setValue(
                            `impact_rules.${index}.filter_name_contains`,
                            "",
                          );
                          scenarioForm.setValue(
                            `impact_rules.${index}.filter_category_is`,
                            "",
                          );
                          scenarioForm.setValue(
                            `impact_rules.${index}.filter_worker_type_contains`,
                            "",
                          );
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itemTypeOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-sm"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {scenarioForm.formState.errors.impact_rules?.[index]
                        ?.item_type && (
                        <p className="text-destructive text-xs mt-1">
                          {t(
                            scenarioForm.formState.errors.impact_rules[index]
                              ?.item_type?.message ?? "",
                          )}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t("field")}</Label>
                      <Select
                        value={rule.field}
                        onValueChange={(val) => {
                          scenarioForm.setValue(
                            `impact_rules.${index}.field`,
                            val,
                          );
                          scenarioForm.setValue(
                            `impact_rules.${index}.adjustment_type`,
                            (getAdjustmentTypeOptions(rule.item_type, val)[0]
                              ?.value as ScenarioRuleFormValues["adjustment_type"]) ||
                              "percentage_increase",
                          );
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getFieldOptions(rule.item_type).map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-sm"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {scenarioForm.formState.errors.impact_rules?.[index]
                        ?.field && (
                        <p className="text-destructive text-xs mt-1">
                          {t(
                            scenarioForm.formState.errors.impact_rules[index]
                              ?.field?.message ?? "",
                          )}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t("adjustmentType")}</Label>
                      <Select
                        value={rule.adjustment_type}
                        onValueChange={(
                          val: ScenarioRuleFormValues["adjustment_type"],
                        ) =>
                          scenarioForm.setValue(
                            `impact_rules.${index}.adjustment_type`,
                            val,
                          )
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAdjustmentTypeOptions(
                            rule.item_type,
                            rule.field,
                          ).map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-sm"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {scenarioForm.formState.errors.impact_rules?.[index]
                        ?.adjustment_type && (
                        <p className="text-destructive text-xs mt-1">
                          {t(
                            scenarioForm.formState.errors.impact_rules[index]
                              ?.adjustment_type?.message ?? "",
                          )}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t("value")}</Label>
                      {rule.item_type === "risks" &&
                      rule.field === "realize_risk_impact" ? (
                        <TranslatedSelect
                          value={rule.value as string}
                          onValueChange={(val) =>
                            scenarioForm.setValue(
                              `impact_rules.${index}.value`,
                              val,
                            )
                          }
                          options={projectRiskOptions}
                          placeholder={t("selectRisk")}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          type="number"
                          step="0.01"
                          {...scenarioForm.register(
                            `impact_rules.${index}.value`,
                            { valueAsNumber: true },
                          )}
                          className="text-sm"
                        />
                      )}
                      {scenarioForm.formState.errors.impact_rules?.[index]
                        ?.value && (
                        <p className="text-destructive text-xs mt-1">
                          {t(
                            scenarioForm.formState.errors.impact_rules[index]
                              ?.value?.message ?? "",
                          )}
                        </p>
                      )}
                    </div>
                    {(rule.item_type === "materials" ||
                      rule.item_type === "equipment") && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm">{t("filterByName")}</Label>
                        <Input
                          {...scenarioForm.register(
                            `impact_rules.${index}.filter_name_contains`,
                          )}
                          placeholder={t("filterNamePlaceholder")}
                          className="text-sm"
                        />
                      </div>
                    )}
                    {rule.item_type === "labor" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm">
                          {t("filterByWorkerType")}
                        </Label>
                        <Input
                          {...scenarioForm.register(
                            `impact_rules.${index}.filter_worker_type_contains`,
                          )}
                          placeholder={t("filterWorkerTypePlaceholder")}
                          className="text-sm"
                        />
                      </div>
                    )}
                    {rule.item_type === "additional" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm">
                          {t("filterByCategory")}
                        </Label>
                        <TranslatedSelect
                          value={rule.filter_category_is || ""}
                          onValueChange={(val) =>
                            scenarioForm.setValue(
                              `impact_rules.${index}.filter_category_is`,
                              val,
                            )
                          }
                          options={additionalCategories}
                          placeholder={t("selectCategory")}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddRule}
                className="text-sm w-full"
              >
                <Plus className={cn("w-4 h-4", getIconMarginClass())} />
                {t("addRule")}
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeScenarioForm}
                disabled={isAddingScenario || isUpdatingScenario}
                className="text-sm"
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isAddingScenario || isUpdatingScenario}
                className="text-sm"
              >
                {isAddingScenario || isUpdatingScenario
                  ? t("common:saving")
                  : t("common:save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={!!deleteTargetScenario}
        onOpenChange={() => setDeleteTargetScenario(null)}
        onConfirm={() =>
          deleteTargetScenario && deleteScenario(deleteTargetScenario.id)
        }
        itemName={deleteTargetScenario?.name}
        loading={isDeletingScenario}
      />
    </div>
  );
}
