import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import EmptyState from "@/shared/components/ui/EmptyState";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Card } from "@/shared/components/ui/card";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useProjectData } from "@/features/projects/project-core/hooks/useProjectData";
import { useProjectMaterials } from "@/features/projects/project-costs/hooks/useProjectMaterials";
import { useProjectLabor } from "@/features/projects/project-costs/hooks/useProjectLabor";
import { useProjectEquipment } from "@/features/projects/project-costs/hooks/useProjectEquipment";
import { useProjectAdditionalCosts } from "@/features/projects/project-costs/hooks/useProjectAdditionalCosts";
import { useProjectRisks } from "@/features/projects/project-costs/hooks/useProjectRisks";
import VersionConflictResolver, {
  ResolutionMap,
} from "./VersionConflictResolver";
import {
  Loader2,
  X,
  Trash2,
  Eye,
  RotateCcw,
  Lock,
  Plus,
  GitCompareArrows,
} from "lucide-react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { useProjectVersions, ProjectVersion } from "@/features/projects/project-versions/hooks/useProjectVersions";
import { useApplyProjectVersion } from "@/features/projects/project-versions/hooks/useApplyProjectVersion";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import {
  computeVersionCostSummary,
  computeVersionDelta,
} from "@/shared/logic/versionCosts";
import VersionComparison from "./VersionComparison";
import { cn, getIconMarginClass } from "@/shared/lib/utils";

export default function ProjectVersionsTab({
  projectId,
  canEdit,
  materialUnits,
  periodUnits,
  additionalCategories,
  riskProbabilities,
}: {
  projectId: string;
  canEdit: boolean;
  materialUnits: { value: string; label: string }[];
  periodUnits: { value: string; label: string }[];
  additionalCategories: { value: string; label: string }[];
  riskProbabilities: { value: string; label: string }[];
}) {
  const { t, i18n } = useTranslation(["project_versions", "common"]);
  const { format } = useCurrencyFormatter();

  const {
    versions,
    isLoadingVersions,
    fetchVersionSnapshot,
    createVersion,
    isCreatingVersion,
    deleteVersion,
    isDeletingVersion,
    finalizeVersion,
    isFinalizingVersion,
  } = useProjectVersions(projectId);

  const { applyProjectVersion, isApplyingVersion } = useApplyProjectVersion();

  const {
    project,
    groups,
    isLoading: isLoadingCurrent,
  } = useProjectData(projectId);

  const { data: materials } = useProjectMaterials(projectId);
  const { data: labor } = useProjectLabor(projectId);
  const { data: equipment } = useProjectEquipment(projectId);
  const { data: additional } = useProjectAdditionalCosts(projectId);
  const { data: risks } = useProjectRisks(projectId);

  const [newVersionName, setNewVersionName] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingVersionSnapshot, setLoadingVersionSnapshot] = useState(false);
  const [versionSnapshot, setVersionSnapshot] = useState<any>(null);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  const [versionToDelete, setVersionToDelete] = useState<ProjectVersion | null>(
    null,
  );
  const [versionToRestore, setVersionToRestore] = useState<
    ProjectVersion | null
  >(null);
  const [versionToFinalize, setVersionToFinalize] = useState<
    ProjectVersion | null
  >(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareAId, setCompareAId] = useState<string>("");
  const [compareBId, setCompareBId] = useState<string>("");

  const handleCreateVersion = useCallback(async () => {
    if (!newVersionName.trim()) return;
    await createVersion({ name: newVersionName });
    setNewVersionName("");
  }, [newVersionName, createVersion]);

  const handleDeleteVersion = useCallback(async () => {
    if (!versionToDelete) return;
    await deleteVersion({ id: versionToDelete.id });
    setVersionToDelete(null);
  }, [deleteVersion, versionToDelete]);

  const handleFinalizeVersion = useCallback(async () => {
    if (!versionToFinalize) return;
    await finalizeVersion({ id: versionToFinalize.id });
    setVersionToFinalize(null);
  }, [finalizeVersion, versionToFinalize]);

  const handlePreview = useCallback(
    async (version: ProjectVersion) => {
      setLoadingVersionSnapshot(true);
      setPreviewVersionId(version.id);
      setPreviewOpen(true);
      try {
        const snapshot =
          version.data ?? (await fetchVersionSnapshot(version.id));
        setVersionSnapshot(snapshot);
      } catch (error: any) {
        toast.error(t("common:error") + ": " + error.message);
        setPreviewOpen(false);
        setPreviewVersionId(null);
      } finally {
        setLoadingVersionSnapshot(false);
      }
    },
    [fetchVersionSnapshot, t],
  );

  const handleResolve = useCallback(
    async (resolution: ResolutionMap) => {
      if (!versionSnapshot) return;
      const toastId = toast.loading(t("restoring"));
      try {
        const buildFinalList = (currentItems: any[], category: string) => {
          const { toAdd, toRemove, toUpdate } =
            resolution[category as keyof ResolutionMap];
          const removeSet = new Set(toRemove);
          const updateMap = new Map(
            toUpdate.map((i) => [i.id, i] as [string, any]),
          );
          const keptItems = currentItems
            .filter((i) => !removeSet.has(i.id))
            .map((i) => (updateMap.has(i.id) ? updateMap.get(i.id) : i));
          return [...keptItems, ...toAdd];
        };

        let finalGroups = groups;
        if (versionSnapshot?.groups) {
          const currentGroupIds = new Set(groups.map((g) => g.id));
          const missingGroups = versionSnapshot.groups.filter(
            (g: any) => !currentGroupIds.has(g.id),
          );
          finalGroups = [...groups, ...missingGroups];
        }

        const finalSnapshot = {
          currency: project?.currency,
          groups: finalGroups,
          materials: buildFinalList(materials, "materials"),
          labor_items: buildFinalList(labor, "labor"),
          equipment_items: buildFinalList(equipment, "equipment"),
          additional_costs: buildFinalList(additional, "additional"),
          risks: buildFinalList(risks, "risks"),
        };

        await applyProjectVersion({
          projectId,
          versionId: previewVersionId!,
          snapshot: finalSnapshot,
          createRollback: true,
        });

        toast.dismiss(toastId);
        setPreviewOpen(false);
        setVersionSnapshot(null);
        setPreviewVersionId(null);
      } catch (error: any) {
        console.error(error);
        toast.error(t("common:error") + ": " + error.message);
        toast.dismiss(toastId);
      }
    },
    [
      project?.currency,
      groups,
      materials,
      labor,
      equipment,
      additional,
      risks,
      versionSnapshot,
      previewVersionId,
      projectId,
      applyProjectVersion,
      t,
    ],
  );

  const currency = project?.currency || "USD";

  const timeline = useMemo(() => {
    return versions.map((v, idx) => {
      const summary = computeVersionCostSummary(v.data);
      const prev = versions[idx + 1];
      const prevSummary = prev ? computeVersionCostSummary(prev.data) : null;
      const delta = computeVersionDelta(prevSummary, summary);
      return { version: v, summary, delta };
    });
  }, [versions]);

  if (previewOpen) {
    const currentData = {
      materials: materials || [],
      labor: labor || [],
      equipment: equipment || [],
      additional: additional || [],
      risks: risks || [],
      groups: groups || [],
    };
    const versionData = {
      materials: versionSnapshot?.materials || [],
      labor: versionSnapshot?.labor_items || [],
      equipment: versionSnapshot?.equipment_items || [],
      additional: versionSnapshot?.additional_costs || [],
      risks: versionSnapshot?.risks || [],
      groups: versionSnapshot?.groups || [],
    };
    return (
      <Card className="p-4 sm:p-6 border-2 border-border shadow-md text-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-4">
          <div>
            <Heading level={3} className="text-foreground">
              {t("restorePreview")}
            </Heading>
            <p className="text-sm text-muted-foreground">
              {t("restoreDescription")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setPreviewOpen(false);
              setVersionSnapshot(null);
              setPreviewVersionId(null);
            }}
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
        {loadingVersionSnapshot || isLoadingCurrent ? (
          <LoadingState className="h-[400px]" />
        ) : (
          <VersionConflictResolver
            currentData={currentData}
            versionData={versionData}
            onResolve={handleResolve}
            onCancel={() => {
              setPreviewOpen(false);
              setVersionSnapshot(null);
              setPreviewVersionId(null);
            }}
            isRestoring={isApplyingVersion}
            currentCurrency={project?.currency}
            versionCurrency={versionSnapshot?.currency}
            materialUnits={materialUnits}
            periodUnits={periodUnits}
            additionalCategories={additionalCategories}
            riskProbabilities={riskProbabilities}
          />
        )}
      </Card>
    );
  }

  if (compareOpen) {
    const versionA = versions.find((v) => v.id === compareAId) || null;
    const versionB = versions.find((v) => v.id === compareBId) || null;
    return (
      <Card className="p-4 sm:p-6 border-2 border-border shadow-md text-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-4">
          <div>
            <Heading level={3} className="text-foreground">
              {t("compareTitle")}
            </Heading>
            <p className="text-sm text-muted-foreground">
              {t("compareDescription")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCompareOpen(false)}
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <Label className="text-sm">{t("compareVersionA")}</Label>
            <Select
              value={compareAId}
              onValueChange={setCompareAId}
              disabled={isLoadingVersions}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder={t("select")} />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-sm">
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">{t("compareVersionB")}</Label>
            <Select
              value={compareBId}
              onValueChange={setCompareBId}
              disabled={isLoadingVersions}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder={t("select")} />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-sm">
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {versionA && versionB ? (
          <VersionComparison
            versionA={versionA}
            versionB={versionB}
            currency={currency}
          />
        ) : (
          <EmptyState message={t("compareSelectBoth")} />
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      {canEdit && (
        <Card className="p-4 space-y-2">
          <Heading level={3}>{t("create")}</Heading>
          <div className="flex gap-2">
            <Input
              placeholder={t("namePlaceholder")}
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              aria-label={t("namePlaceholder")}
              className="h-11 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newVersionName.trim()) {
                  e.preventDefault();
                  handleCreateVersion();
                }
              }}
            />
            <Button
              onClick={handleCreateVersion}
              className="h-11 text-sm"
              disabled={isCreatingVersion || !newVersionName.trim()}
              aria-label={t("create")}
            >
              {isCreatingVersion ? (
                <Loader2 className={cn("w-4 h-4 animate-spin", getIconMarginClass())} />
              ) : (
                <Plus className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
              )}
              {t("create")}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Heading level={3}>{t("restore")}</Heading>
          {timeline.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCompareAId(versions[0]?.id || "");
                setCompareBId(versions[1]?.id || "");
                setCompareOpen(true);
              }}
              className="h-9 text-sm"
              aria-label={t("compare")}
            >
              <GitCompareArrows className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
              {t("compare")}
            </Button>
          )}
        </div>
        {isLoadingVersions ? (
          <LoadingState />
        ) : timeline.length === 0 ? (
          <EmptyState message={t("noVersionsDescription")} />
        ) : (
          <ol className="space-y-3" aria-label={t("restore")}>
            {timeline.map(({ version, summary, delta }, idx) => {
              const prev = versions[versions.indexOf(version) + 1];
              const prevTotal = prev
                ? computeVersionCostSummary(prev.data).directTotal
                : null;
              const isCurrent = idx === 0;
              return (
                <li
                  key={version.id}
                  className={cn(
                    "border rounded-lg p-3 sm:p-4 bg-card",
                    version.is_final && "border-primary/40 bg-muted/40",
                    isCurrent && "border-primary/60",
                  )}
                  data-testid={`version-row-${version.id}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base truncate">
                          {version.name}
                        </span>
                        {isCurrent && (
                          <Badge
                            variant="success"
                            aria-label={t("currentBadge")}
                          >
                            {t("currentBadge")}
                          </Badge>
                        )}
                        {version.is_final && (
                          <Badge aria-label={t("finalizedBadge")}>
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            {t("finalizedBadge")}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span>
                          {t("createdOn")}{" "}
                          {new Date(version.created_at).toLocaleString(
                            i18n.language,
                          )}
                        </span>
                        {version.author_name && (
                          <span>
                            {t("author")}: {version.author_name}
                          </span>
                        )}
                      </div>
                      <div className="text-sm pt-1 space-y-0.5">
                        <div className="tabular-nums">
                          <span className="text-muted-foreground">
                            {t("directTotal")}:{" "}
                          </span>
                          <span className="font-medium">
                            {format(summary.directTotal, currency)}
                          </span>
                        </div>
                        {prevTotal !== null && (
                          <div
                            className={cn(
                              "tabular-nums text-xs",
                              delta.directTotal > 0
                                ? "text-destructive"
                                : delta.directTotal < 0
                                  ? "text-success"
                                  : "text-muted-foreground",
                            )}
                          >
                            {delta.directTotal > 0 && "▲ "}
                            {delta.directTotal < 0 && "▼ "}
                            {t("delta")}:{" "}
                            {format(Math.abs(delta.directTotal), currency, {
                              showSign: false,
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(version)}
                          className="h-9 w-9"
                          aria-label={`${t("preview")} ${version.name}`}
                          disabled={loadingVersionSnapshot}
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setVersionToRestore(version)}
                          className="h-9 w-9"
                          aria-label={`${t("restoreAction")} ${version.name}`}
                          disabled={version.is_final || isApplyingVersion}
                          title={
                            version.is_final
                              ? t("finalizedCannotRestore")
                              : t("restoreAction")
                          }
                        >
                          <RotateCcw
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                        </Button>
                        {!version.is_final && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setVersionToFinalize(version)}
                            className="h-9 w-9"
                            aria-label={`${t("finalize")} ${version.name}`}
                            disabled={isFinalizingVersion}
                          >
                            <Lock className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setVersionToDelete(version)}
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          aria-label={`${t("deleteAction")} ${version.name}`}
                          disabled={isDeletingVersion}
                        >
                          <Trash2
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <ConfirmDialog
        open={!!versionToDelete}
        onOpenChange={(o) => !o && setVersionToDelete(null)}
        onConfirm={handleDeleteVersion}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody", { name: versionToDelete?.name ?? "" })}
        confirmLabel={t("deleteAction")}
        loading={isDeletingVersion}
        destructive
      />

      <ConfirmDialog
        open={!!versionToRestore}
        onOpenChange={(o) => !o && setVersionToRestore(null)}
        title={t("restoreConfirmTitle")}
        body={t("restoreConfirmBody", { name: versionToRestore?.name ?? "" })}
        confirmLabel={t("restoreAction")}
        loading={isApplyingVersion}
        onConfirm={() => {
          const v = versionToRestore;
          setVersionToRestore(null);
          if (v) handlePreview(v);
        }}
      />

      <ConfirmDialog
        open={!!versionToFinalize}
        onOpenChange={(o) => !o && setVersionToFinalize(null)}
        title={t("finalizeConfirmTitle")}
        body={t("finalizeConfirmBody", { name: versionToFinalize?.name ?? "" })}
        confirmLabel={t("finalize")}
        loading={isFinalizingVersion}
        onConfirm={handleFinalizeVersion}
      />
    </div>
  );
}
