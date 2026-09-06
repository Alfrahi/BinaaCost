"use client";

import React, { Suspense, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageLoader from "@/components/PageLoader";
import { useProjectData } from "@/features/project/useProjectData";
import CommentsDrawer from "@/components/CommentsDrawer";
import { useProjectComments } from "@/hooks/useProjectComments";
import FinancialSummaryBar from "./FinancialSummaryBar";
import {
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  TrendingUp,
  BarChart,
  FileText,
  GitBranch,
  FlaskConical,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
  Risk,
} from "@/types/project-items";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";

const LazyOverviewTab = React.lazy(() => import("./OverviewTab"));
const LazyCostsTab = React.lazy(() => import("./CostsTab"));
const LazyRiskManagementTable = React.lazy(
  () => import("./RiskManagementTable"),
);
const LazyScenarioAnalysisTab = React.lazy(() =>
  import("./ScenarioAnalysisTab").then((module) => ({
    default: module.ScenarioAnalysisTab,
  })),
);
const LazyProfitPricingSummaryCard = React.lazy(
  () => import("./ProfitPricingSummaryCard"),
);
const LazyAnalyticsTab = React.lazy(() => import("./AnalyticsTab"));
const LazyReportsTab = React.lazy(() => import("./ReportsTab"));
const LazyProjectVersionsTab = React.lazy(() => import("./ProjectVersionsTab"));

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

function ProjectTabsComponent({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const { t, i18n } = useTranslation([
    "project_tabs",
    "project_detail",
    "common",
    "project_risk",
    "scenario_analysis",
    "project_versions",
    "durations",
  ]);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    project,
    sizeUnits,
    projectTypes,
    groups,
    materials,
    labor,
    equipment,
    additional,
    risks,
    totals,
    isLoading,
    error,
  } = useProjectData(projectId);

  const {
    itemComments,
    commentsDrawerOpen,
    setCommentsDrawerOpen,
    selectedCommentItem,
    selectedCommentItemType,
    handleOpenComments,
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    currentUserId,
    isAnyCommentMutationLoading,
  } = useProjectComments(projectId);

  const { options: materialUnits, isLoading: isLoadingMaterialUnits } =
    useSettingsOptions("material_unit");
  const { options: rentalOptions, isLoading: isLoadingRentalOptions } =
    useSettingsOptions("equipment_rental_purchase");
  const { options: periodUnits, isLoading: isLoadingPeriodUnits } =
    useSettingsOptions("equipment_period_unit");
  const {
    options: additionalCategories,
    isLoading: isLoadingAdditionalCategories,
  } = useSettingsOptions("additional_cost_category");
  const { options: riskProbabilities, isLoading: isLoadingRiskProbabilities } =
    useSettingsOptions("risk_probability");
  const { options: durationUnits } = useSettingsOptions("duration_unit");

  const tabItems = useMemo(
    () => [
      {
        value: "overview",
        labelKey: "project_tabs:overview",
        icon: LayoutDashboard,
      },
      { value: "costs", labelKey: "project_tabs:costs", icon: Receipt },
      { value: "risks", labelKey: "project_tabs:risks", icon: ShieldAlert },
      {
        value: "scenario-analysis",
        labelKey: "project_tabs:scenarioAnalysis",
        icon: FlaskConical,
      },
      {
        value: "profit-pricing",
        labelKey: "project_tabs:profitPricing",
        icon: TrendingUp,
      },
      {
        value: "analytics",
        labelKey: "project_tabs:analytics",
        icon: BarChart,
      },
      { value: "reports", labelKey: "project_tabs:reports", icon: FileText },
      { value: "versions", labelKey: "project_tabs:versions", icon: GitBranch },
    ],
    [],
  );

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return <div className="text-red-500">{error.message}</div>;
  }

  if (!project) {
    return (
      <div className="text-center py-8">{t("project_detail:notFound")}</div>
    );
  }

  const getCommentItemName = (
    item:
      | MaterialItem
      | LaborItem
      | EquipmentItem
      | AdditionalCostItem
      | Risk
      | null,
    type: string | null,
  ): string => {
    if (!item || !type) return t("common:item");

    switch (type) {
      case "material":
      case "equipment":
        return (item as MaterialItem | EquipmentItem).name || t("common:item");
      case "labor":
        return (item as LaborItem).worker_type || t("common:item");
      case "additional":
      case "risk":
        return (
          (item as AdditionalCostItem | Risk).description || t("common:item")
        );
      default:
        return t("common:item");
    }
  };

  return (
    <>
      <FinancialSummaryBar
        costs={totals}
        currency={project.currency}
        settings={project.financial_settings}
        onViewPricing={() => setActiveTab("profit-pricing")}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} dir={i18n.dir()}>
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full text-sm mb-4">
              <SelectValue placeholder={t("project_tabs:selectTab")} />
            </SelectTrigger>
            <SelectContent>
              {tabItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="text-sm"
                >
                  {t(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <TabsList className="w-full justify-start">
              {tabItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={tabVariants}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<PageLoader className="h-40" />}>
              <TabsContent value="overview" className="mt-4">
                <LazyOverviewTab
                  project={project}
                  sizeUnits={sizeUnits}
                  projectTypes={projectTypes}
                  durationUnits={durationUnits}
                />
              </TabsContent>

              <TabsContent value="costs" className="mt-4">
                <LazyCostsTab
                  projectId={projectId}
                  materials={materials}
                  labor={labor}
                  equipment={equipment}
                  additional={additional}
                  groups={groups}
                  canEdit={canEdit}
                  currency={project.currency}
                  onOpenComments={handleOpenComments}
                  materialUnits={materialUnits}
                  isLoadingMaterialUnits={isLoadingMaterialUnits}
                  rentalOptions={rentalOptions}
                  isLoadingRentalOptions={isLoadingRentalOptions}
                  periodUnits={periodUnits}
                  isLoadingPeriodUnits={isLoadingPeriodUnits}
                  additionalCategories={additionalCategories}
                  isLoadingAdditionalCategories={isLoadingAdditionalCategories}
                />
              </TabsContent>

              <TabsContent value="risks" className="mt-4">
                <LazyRiskManagementTable
                  projectId={projectId}
                  risks={risks}
                  currency={project.currency}
                  canEdit={canEdit}
                  riskProbabilities={riskProbabilities}
                  isLoadingRiskProbabilities={isLoadingRiskProbabilities}
                />
              </TabsContent>

              <TabsContent value="scenario-analysis" className="mt-4">
                <LazyScenarioAnalysisTab
                  projectId={projectId}
                  risks={risks}
                  currency={project.currency}
                  canEdit={canEdit}
                  additionalCategories={additionalCategories}
                  riskProbabilities={riskProbabilities}
                />
              </TabsContent>

              <TabsContent value="profit-pricing" className="mt-4">
                <LazyProfitPricingSummaryCard
                  projectId={projectId}
                  materialsTotal={totals.materialsTotal}
                  laborTotal={totals.laborTotal}
                  equipmentTotal={totals.equipmentTotal}
                  additionalTotal={totals.additionalTotal}
                  currency={project.currency}
                  initialSettings={project.financial_settings}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <LazyAnalyticsTab
                  materialsTotal={totals.materialsTotal}
                  laborTotal={totals.laborTotal}
                  equipmentTotal={totals.equipmentTotal}
                  additionalTotal={totals.additionalTotal}
                  currency={project.currency}
                />
              </TabsContent>

              <TabsContent value="reports" className="mt-4">
                <LazyReportsTab
                  project={project}
                  materialsTotal={totals.materialsTotal}
                  laborTotal={totals.laborTotal}
                  equipmentTotal={totals.equipmentTotal}
                  additionalTotal={totals.additionalTotal}
                  materials={materials}
                  labor={labor}
                  equipment={equipment}
                  additional={additional}
                  risks={risks}
                  groups={groups}
                  materialUnits={materialUnits}
                  periodUnits={periodUnits}
                  additionalCategories={additionalCategories}
                  riskProbabilities={riskProbabilities}
                />
              </TabsContent>

              <TabsContent value="versions" className="mt-4">
                <LazyProjectVersionsTab
                  projectId={projectId}
                  canEdit={canEdit}
                  materialUnits={materialUnits}
                  periodUnits={periodUnits}
                  additionalCategories={additionalCategories}
                  riskProbabilities={riskProbabilities}
                />
              </TabsContent>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      <CommentsDrawer
        open={commentsDrawerOpen}
        onOpenChange={setCommentsDrawerOpen}
        comments={itemComments}
        onAddComment={handleAddComment}
        onUpdateComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
        itemName={getCommentItemName(
          selectedCommentItem,
          selectedCommentItemType,
        )}
        currentUserId={currentUserId}
        loading={isAnyCommentMutationLoading}
      />
    </>
  );
}

export default ProjectTabsComponent;
