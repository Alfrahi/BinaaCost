import React, { useState, useRef, useMemo, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/AuthProvider";
import { pb } from "@/integrations/pocketbase/client";
import { calculateProjectFinancials } from "@/logic/financials";
import {
  FinancialAssumptionsStrip,
  DefaultAssumptionsWarning,
} from "./FinancialAssumptions";
import { Loader2, FileText, Users, DollarSign } from "lucide-react";
import { cn, getIconMarginClass } from "@/lib/utils";
import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
  Risk,
  ProjectGroup,
} from "@/types/project-items";
import { sanitizeText } from "@/utils/sanitizeText";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useProjectVersions } from "@/hooks/useProjectVersions";

const LazyClientProposalReport = React.lazy(() =>
  import("../reports/ClientProposalReport").then((module) => ({
    default: module.ClientProposalReport,
  })),
);
const LazyProjectCostReport = React.lazy(() =>
  import("../reports/ProjectCostReport").then((module) => ({
    default: module.ProjectCostReport,
  })),
);

export default function ReportsTab({
  project,
  materialsTotal,
  laborTotal,
  equipmentTotal,
  additionalTotal,
  materials,
  labor,
  equipment,
  additional,
  risks,
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
  materials: MaterialItem[];
  labor: LaborItem[];
  equipment: EquipmentItem[];
  additional: AdditionalCostItem[];
  risks: Risk[];
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
  const isMobile = useIsMobile();
  const [clientName, setClientName] = useState("");
  const [terms, setTerms] = useState(t("project_reports:defaultTerms"));
  const [activeReportTab, setActiveReportTab] = useState("project-cost");
  const clientProposalRef = useRef<HTMLDivElement>(null);
  const projectCostRef = useRef<HTMLDivElement>(null);

  const { generatePdf, isGenerating } = usePdfExport();
  const { versions } = useProjectVersions(project.id);

  // Latest finalized version, if any — stamped onto exported reports so the
  // client-facing output records which locked estimate it reflects.
  const versionStamp = useMemo(() => {
    const finalized = versions.find((v) => v.is_final);
    if (!finalized) return undefined;
    return {
      name: finalized.name,
      date: new Date(finalized.created_at).toLocaleDateString(i18n.language),
    };
  }, [versions, i18n.language]);

  const allSettingsOptions = useMemo(
    () => ({
      material_unit: materialUnits,
      equipment_period_unit: periodUnits,
      additional_cost_category: additionalCategories,
      risk_probability: riskProbabilities,
    }),
    [materialUnits, periodUnits, additionalCategories, riskProbabilities],
  );

  const financials = useMemo(() => {
    return calculateProjectFinancials(
      {
        materialsTotal,
        laborTotal,
        equipmentTotal,
        additionalTotal,
      },
      project.financial_settings || {
        overhead_percent: 10,
        markup_percent: 20,
        tax_percent: 0,
        contingency_percent: 5,
      },
    );
  }, [
    materialsTotal,
    laborTotal,
    equipmentTotal,
    additionalTotal,
    project.financial_settings,
  ]);

  const companyInfo = {
    name: (user?.company_name as string) || "",
    website: (user?.company_website as string) || "",
    logoUrl: user ? pb.files.getURL(user, user.avatar) || "" : "",
    email: user?.email || "",
  };

  const sanitizedTerms = useMemo(() => sanitizeText(terms) || "", [terms]);

  const reportTabItems = useMemo(
    () => [
      {
        value: "project-cost",
        labelKey: "project_reports:detailedCostReport",
        icon: DollarSign,
      },
      {
        value: "client-proposal",
        labelKey: "project_reports:clientProposal",
        icon: Users,
      },
    ],
    [],
  );

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
          <CardTitle className="text-lg">
            {t("project_reports:tabTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <DefaultAssumptionsWarning project={project} />
            <FinancialAssumptionsStrip
              settings={project.financial_settings}
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
                  />
                </SelectTrigger>
                <SelectContent>
                  {reportTabItems.map((item) => (
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
                  {reportTabItems.map((item) => (
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

            <TabsContent value="project-cost" className="mt-4 space-y-4">
              <Button
                onClick={() => handleGeneratePdf("projectCost")}
                disabled={isGenerating}
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
                    <LazyProjectCostReport
                      ref={projectCostRef}
                      project={project}
                      financials={financials}
                      materials={materials}
                      labor={labor}
                      equipment={equipment}
                      additional={additional}
                      risks={risks}
                      groups={groups}
                      companyInfo={companyInfo}
                      preparedBy={user?.email || t("common:unknownUser")}
                      versionStamp={versionStamp}
                      allSettingsOptions={allSettingsOptions}
                    />
                  </Suspense>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="client-proposal" className="mt-4 space-y-4">
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
                disabled={isGenerating}
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
                    <LazyClientProposalReport
                      ref={clientProposalRef}
                      project={project}
                      financials={financials}
                      companyInfo={companyInfo}
                      terms={sanitizedTerms}
                      preparedBy={companyInfo.name || t("common:ourTeam")}
                      clientName={clientName}
                      versionStamp={versionStamp}
                    />
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
