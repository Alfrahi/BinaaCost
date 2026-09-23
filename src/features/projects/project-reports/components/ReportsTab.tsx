import React, { useState, useRef, useMemo, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useAuth } from "@/features/auth";
import { pb } from "@/integrations/pocketbase/client";
import { calculateProjectFinancials, DEFAULT_FINANCIAL_SETTINGS } from "@/shared/logic/financials";
import { calculateCategoryTotal } from "@/shared/logic/shared";
import {
  computeVersionCostSummary,
  getVersionFinancialSettings,
} from "@/shared/logic/versionCosts";
import type { ProjectSnapshotData } from "@/features/projects/project-versions/types/version";
import { toast } from "sonner";
import {
  FinancialAssumptionsStrip,
  DefaultAssumptionsWarning,
  IncompleteItemsWarning,
} from "./FinancialAssumptions";
import { countIncompleteItems } from "@/shared/logic/overview";
import { Loader2, FileText, Users, DollarSign } from "lucide-react";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import LoadingState from "@/shared/components/ui/LoadingState";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { useIsMobile } from "@/shared/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { usePdfExport } from "@/features/reports";
import {
  useProjectVersions,
  useProjectMaterials,
  useProjectLabor,
  useProjectEquipment,
  useProjectAdditionalCosts,
  useProjectRisks,
  type ProjectGroup,
} from "@/features/projects";
import { useReportSettings } from "@/features/settings";

const LazyClientProposalReport = React.lazy(() =>
  import("./ClientProposalReport").then((module) => ({
    default: module.ClientProposalReport,
  })),
);
const LazyProjectCostReport = React.lazy(() =>
  import("./ProjectCostReport").then((module) => ({
    default: module.ProjectCostReport,
  })),
);

const reportTabItems = [
  {
    value: "project-cost",
    labelKey: "project_reports:detailedCostReport",
    icon: DollarSign,
    badgeKey: "project_reports:internalLabel",
    badgeVariant: "muted",
  },
  {
    value: "client-proposal",
    labelKey: "project_reports:clientProposal",
    icon: Users,
    badgeKey: "project_reports:clientFacingLabel",
    badgeVariant: "default",
  },
] as const;

export default function ReportsTab({
  project,
  materialsTotal,
  laborTotal,
  equipmentTotal,
  additionalTotal,
  groups,
  materialUnits,
  periodUnits,
  additionalCategories,
  riskProbabilities,
}: {
  project: any;
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  additionalTotal: number;
  groups: ProjectGroup[];
  materialUnits: { value: string; label: string }[];
  periodUnits: { value: string; label: string }[];
  additionalCategories: { value: string; label: string }[];
  riskProbabilities: { value: string; label: string }[];
}) {
  const { t, i18n } = useTranslation([
    "project_detail",
    "project_reports",
    "common",
    "project_tabs",
  ]);
  const { user } = useAuth();
  const { reportSettings } = useReportSettings();
  const isMobile = useIsMobile();
  const [clientName, setClientName] = useState("");
  const [terms, setTerms] = useState(
    () => reportSettings.default_terms || t("project_reports:defaultTerms"),
  );
  const [activeReportTab, setActiveReportTab] = useState("project-cost");
  const clientProposalRef = useRef<HTMLDivElement>(null);
  const projectCostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reportSettings.default_terms && terms === t("project_reports:defaultTerms")) {
      setTerms(reportSettings.default_terms);
    }
  }, [reportSettings.default_terms, t, terms]);

  // Use entity hooks directly for data fetching
  const { data: materials = [] } = useProjectMaterials(project.id);
  const { data: labor = [] } = useProjectLabor(project.id);
  const { data: equipment = [] } = useProjectEquipment(project.id);
  const { data: additional = [] } = useProjectAdditionalCosts(project.id);
  const { data: risks = [] } = useProjectRisks(project.id);

  const { generatePdf, isGenerating } = usePdfExport();
  const { versions, fetchVersionSnapshot } = useProjectVersions(project.id);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("current");
  const [snapshotData, setSnapshotData] = useState<ProjectSnapshotData | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);

  // If a selected version is no longer in the list (e.g. deleted), fall back to "current"
  useEffect(() => {
    if (
      selectedVersionId !== "current" &&
      versions.length > 0 &&
      !versions.some((v) => v.id === selectedVersionId)
    ) {
      setSelectedVersionId("current");
    }
  }, [versions, selectedVersionId]);

  useEffect(() => {
    if (!selectedVersionId || selectedVersionId === "current") {
      setSnapshotData(null);
      setIsLoadingSnapshot(false);
      return;
    }

    const version = versions.find((v) => v.id === selectedVersionId);
    if (!version) {
      setSnapshotData(null);
      setIsLoadingSnapshot(false);
      return;
    }

    const parseSnapshot = (raw: unknown): ProjectSnapshotData | null => {
      if (!raw) return null;
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw as ProjectSnapshotData;
    };

    const parsed = parseSnapshot(version.data);
    if (parsed) {
      setSnapshotData(parsed);
      setIsLoadingSnapshot(false);
      return;
    }

    if (!fetchVersionSnapshot) {
      setSnapshotData(null);
      setIsLoadingSnapshot(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingSnapshot(true);
    Promise.resolve(fetchVersionSnapshot(selectedVersionId))
      .then((data) => {
        if (!isCancelled) {
          setSnapshotData(parseSnapshot(data));
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          toast.error(
            t("common:error") + ": " + (err?.message || "Failed to load snapshot"),
          );
          setSnapshotData(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingSnapshot(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedVersionId, versions, fetchVersionSnapshot, t]);

  const isHistorical = selectedVersionId !== "current" && !!selectedVersionId;

  const selectedVersion = useMemo(() => {
    if (!isHistorical || versions.length === 0) return null;
    return versions.find((v) => v.id === selectedVersionId) ?? null;
  }, [isHistorical, selectedVersionId, versions]);

  const selectedVersionLabel = useMemo(() => {
    if (!isHistorical || !selectedVersion) {
      return t("project_reports:liveEstimate", "Current Estimate (Live)");
    }
    return `${selectedVersion.name} (${new Date(selectedVersion.created_at).toLocaleDateString(i18n.language)})`;
  }, [isHistorical, selectedVersion, i18n.language, t]);

  const activeReportTabLabel = useMemo(() => {
    const item = reportTabItems.find((i) => i.value === activeReportTab);
    return item ? `${t(item.labelKey)} — ${t(item.badgeKey)}` : undefined;
  }, [activeReportTab, t]);

  const versionStampForExport = useMemo<{ name: string; date: string } | undefined>(() => {
    if (!isHistorical || !selectedVersion) return undefined;
    return {
      name: selectedVersion.name,
      date: new Date(selectedVersion.created_at).toLocaleDateString(i18n.language),
    };
  }, [isHistorical, selectedVersion, i18n.language]);

  const allSettingsOptions = useMemo(
    () => ({
      material_unit: materialUnits,
      equipment_period_unit: periodUnits,
      additional_cost_category: additionalCategories,
      risk_probability: riskProbabilities,
    }),
    [materialUnits, periodUnits, additionalCategories, riskProbabilities],
  );

  // Derive active items and settings (historical snapshot when a version is selected, otherwise live)
  const activeMaterials = useMemo(() => {
    return isHistorical && snapshotData ? snapshotData.materials || [] : materials;
  }, [isHistorical, snapshotData, materials]);

  const activeLabor = useMemo(() => {
    return isHistorical && snapshotData ? snapshotData.labor_items || [] : labor;
  }, [isHistorical, snapshotData, labor]);

  const activeEquipment = useMemo(() => {
    return isHistorical && snapshotData ? snapshotData.equipment_items || [] : equipment;
  }, [isHistorical, snapshotData, equipment]);

  const activeAdditional = useMemo(() => {
    return isHistorical && snapshotData ? snapshotData.additional_costs || [] : additional;
  }, [isHistorical, snapshotData, additional]);

  const activeRisks = useMemo(() => {
    return isHistorical && snapshotData ? snapshotData.risks || [] : risks;
  }, [isHistorical, snapshotData, risks]);

  const incompleteCount = useMemo(
    () =>
      countIncompleteItems({
        materials: activeMaterials,
        labor: activeLabor,
        equipment: activeEquipment,
        additional: activeAdditional,
      }),
    [activeMaterials, activeLabor, activeEquipment, activeAdditional],
  );

  const activeGroups = useMemo(() => {
    if (isHistorical && snapshotData?.project_groups && snapshotData.project_groups.length > 0) {
      return snapshotData.project_groups;
    }
    return groups;
  }, [isHistorical, snapshotData, groups]);

  const activeFinancialSettings = useMemo(() => {
    if (isHistorical && snapshotData) {
      return getVersionFinancialSettings(snapshotData);
    }
    return project.financial_settings || DEFAULT_FINANCIAL_SETTINGS;
  }, [isHistorical, snapshotData, project.financial_settings]);

  const activeProject = useMemo(() => {
    if (isHistorical && snapshotData?.project) {
      return {
        ...project,
        ...snapshotData.project,
        financial_settings: activeFinancialSettings,
      };
    }
    return {
      ...project,
      financial_settings: activeFinancialSettings,
    };
  }, [isHistorical, snapshotData, project, activeFinancialSettings]);

  const activeFinancials = useMemo(() => {
    if (isHistorical && snapshotData) {
      if (
        snapshotData.financials &&
        typeof snapshotData.financials.grandTotal === "number"
      ) {
        return snapshotData.financials;
      }
      const summary = computeVersionCostSummary(snapshotData);
      const riskContingency = calculateCategoryTotal.risks(activeRisks);
      return calculateProjectFinancials(
        {
          materialsTotal: summary.materials,
          laborTotal: summary.labor,
          equipmentTotal: summary.equipment,
          additionalTotal: summary.additional,
          riskContingency,
        },
        activeFinancialSettings,
      );
    }
    const riskContingency = calculateCategoryTotal.risks(risks);
    return calculateProjectFinancials(
      {
        materialsTotal,
        laborTotal,
        equipmentTotal,
        additionalTotal,
        riskContingency,
      },
      activeFinancialSettings,
    );
  }, [
    isHistorical,
    snapshotData,
    activeRisks,
    activeFinancialSettings,
    materialsTotal,
    laborTotal,
    equipmentTotal,
    additionalTotal,
    risks,
  ]);

  const companyInfo = {
    name: reportSettings.company_name || "",
    website: reportSettings.company_website || "",
    logoUrl: reportSettings.company_logo_url || (user ? pb.files.getURL(user, user.avatar) || "" : ""),
    email: reportSettings.company_email || user?.email || "",
  };

  const sanitizedTerms = useMemo(() => sanitizeText(terms) || "", [terms]);

  const handleGeneratePdf = async (
    reportType: "clientProposal" | "projectCost",
  ) => {
    const targetRef =
      reportType === "clientProposal" ? clientProposalRef : projectCostRef;
    await generatePdf(reportType, targetRef, project.name);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("project_reports:tabTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <IncompleteItemsWarning count={incompleteCount} />
            <DefaultAssumptionsWarning project={activeProject} />
            <FinancialAssumptionsStrip
              settings={activeFinancialSettings}
            />
          </div>
          <Tabs
            defaultValue="project-cost"
            value={activeReportTab}
            onValueChange={setActiveReportTab}
          >
            {isMobile ? (
              <Select
                value={activeReportTab}
                onValueChange={setActiveReportTab}
              >
                <SelectTrigger className="w-full text-sm mb-4">
                  <SelectValue
                    placeholder={t("project_reports:selectReport")}
                  >
                    {activeReportTabLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {reportTabItems.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className="text-sm"
                    >
                      {t(item.labelKey)} — {t(item.badgeKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap pb-2">
                <TabsList className="w-full justify-start">
                  {reportTabItems.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <item.icon className="w-4 h-4" />
                      {t(item.labelKey)}
                      <Badge variant={item.badgeVariant}>
                        {t(item.badgeKey)}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            )}

            <TabsContent value="project-cost" className="mt-4 space-y-4">
              <div className="mb-4">
                <Label htmlFor="version-select-project-cost" className="text-sm">
                  {t("project_reports:versionToExport")}
                </Label>
                <Select
                  value={selectedVersionId}
                  onValueChange={setSelectedVersionId}
                >
                  <SelectTrigger id="version-select-project-cost" className="w-full mt-1 text-sm">
                    <SelectValue placeholder={t("project_reports:versionToExport")}>
                      {selectedVersionLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">
                      {t("project_reports:liveEstimate", "Current Estimate (Live)")}
                    </SelectItem>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                      >
                        {v.name} ({new Date(v.created_at).toLocaleDateString(i18n.language)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => handleGeneratePdf("projectCost")}
                disabled={isGenerating || isLoadingSnapshot}
                className="text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className={cn("w-4 h-4", getIconMarginClass())} />
                    {t("common:generating")}
                  </>
                ) : (
                  <>
                    <FileText className={cn("w-4 h-4", getIconMarginClass())} />
                    {t("project_reports:generatePdf")}
                  </>
                )}
              </Button>
              <div className="border rounded-lg overflow-hidden shadow-inner bg-muted p-4 mt-4">
                <div className="max-h-[600px] overflow-y-auto bg-card p-4">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-40">
                        <LoadingState className="py-0" />
                      </div>
                    }
                  >
                    {isLoadingSnapshot ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <LazyProjectCostReport
                        ref={projectCostRef}
                        project={activeProject}
                        financials={activeFinancials}
                        materials={activeMaterials}
                        labor={activeLabor}
                        equipment={activeEquipment}
                        additional={activeAdditional}
                        risks={activeRisks}
                        groups={activeGroups}
                        companyInfo={companyInfo}
                        preparedBy={user?.email || t("common:unknownUser")}
                        versionStamp={versionStampForExport}
                        allSettingsOptions={allSettingsOptions}
                      />
                    )}
                  </Suspense>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="client-proposal" className="mt-4 space-y-4">
              <div className="mb-4">
                <Label htmlFor="version-select-client-proposal" className="text-sm">
                  {t("project_reports:versionToExport")}
                </Label>
                <Select
                  value={selectedVersionId}
                  onValueChange={setSelectedVersionId}
                >
                  <SelectTrigger id="version-select-client-proposal" className="w-full mt-1 text-sm">
                    <SelectValue placeholder={t("project_reports:versionToExport")}>
                      {selectedVersionLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">
                      {t("project_reports:liveEstimate", "Current Estimate (Live)")}
                    </SelectItem>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                      >
                        {v.name} ({new Date(v.created_at).toLocaleDateString(i18n.language)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="clientName" className="text-sm">
                  {t("project_reports:clientName")}
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t("project_reports:clientNamePlaceholder")}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="terms" className="text-sm">
                  {t("project_reports:termsAndConditions")}
                </Label>
                <Textarea
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={8}
                  placeholder={t("project_reports:defaultTerms")}
                  className="text-sm"
                />
              </div>
              <Button
                onClick={() => handleGeneratePdf("clientProposal")}
                disabled={isGenerating || isLoadingSnapshot}
                className="text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className={cn("w-4 h-4", getIconMarginClass())} />
                    {t("common:generating")}
                  </>
                ) : (
                  <>
                    <FileText className={cn("w-4 h-4", getIconMarginClass())} />
                    {t("project_reports:generatePdf")}
                  </>
                )}
              </Button>
              <div className="border rounded-lg overflow-hidden shadow-inner bg-muted p-4 mt-4">
                <div className="max-h-[600px] overflow-y-auto bg-card p-4">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    }
                  >
                    {isLoadingSnapshot ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <LazyClientProposalReport
                        ref={clientProposalRef}
                        project={activeProject}
                        financials={activeFinancials}
                        companyInfo={companyInfo}
                        terms={sanitizedTerms}
                        preparedBy={companyInfo.name || t("common:ourTeam")}
                        clientName={clientName}
                        versionStamp={versionStampForExport}
                      />
                    )}
                  </Suspense>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
