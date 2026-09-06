import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useProjectData } from "@/features/project/useProjectData";
import VersionConflictResolver, {
  ResolutionMap,
} from "./VersionConflictResolver";
import { Loader2, X, Settings, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useProjectVersions } from "@/hooks/useProjectVersions";
import { useApplyProjectVersion } from "@/hooks/useApplyProjectVersion";

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

  const {
    versions,
    isLoadingVersions,
    fetchVersionSnapshot,
    createVersion,
    isCreatingVersion,
    deleteVersion,
    isDeletingVersion,
  } = useProjectVersions(projectId);

  const { applyProjectVersion, isApplyingVersion } = useApplyProjectVersion();

  const {
    project,
    groups,
    materials,
    labor,
    equipment,
    additional,
    risks,
    isLoading: isLoadingCurrent,
  } = useProjectData(projectId);

  const [newVersionName, setNewVersionName] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingVersionSnapshot, setLoadingVersionSnapshot] = useState(false);
  const [versionSnapshot, setVersionSnapshot] = useState<any>(null);

  const [manageOpen, setManageOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

  const handleCreateVersion = useCallback(async () => {
    if (!newVersionName.trim()) return;
    await createVersion({ name: newVersionName });
    setNewVersionName("");
  }, [newVersionName, createVersion]);

  const handleDeleteVersion = useCallback(
    async (id: string) => {
      await deleteVersion({ id });
      setVersionToDelete(null);
      if (selectedVersionId === id) {
        setSelectedVersionId("");
      }
    },
    [deleteVersion, selectedVersionId],
  );

  const handleViewChanges = useCallback(async () => {
    if (!selectedVersionId) return;
    setLoadingVersionSnapshot(true);
    setPreviewOpen(true);
    try {
      const snapshot = await fetchVersionSnapshot(selectedVersionId);
      setVersionSnapshot(snapshot);
    } catch (error: any) {
      toast.error(t("common:error") + ": " + error.message);
      setPreviewOpen(false);
    } finally {
      setLoadingVersionSnapshot(false);
    }
  }, [selectedVersionId, fetchVersionSnapshot, t]);

  const handleResolve = useCallback(
    async (resolution: ResolutionMap) => {
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
          versionId: selectedVersionId,
          snapshot: finalSnapshot,
          createRollback: true,
        });

        toast.dismiss(toastId);
        setPreviewOpen(false);
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
      versionSnapshot?.groups,
      projectId,
      selectedVersionId,
      applyProjectVersion,
      t,
    ],
  );

  const currentData = useMemo(
    () => ({
      materials: materials || [],
      labor: labor || [],
      equipment: equipment || [],
      additional: additional || [],
      risks: risks || [],
      groups: groups || [],
    }),
    [materials, labor, equipment, additional, risks, groups],
  );

  const versionData = useMemo(
    () => ({
      materials: versionSnapshot?.materials || [],
      labor: versionSnapshot?.labor_items || [],
      equipment: versionSnapshot?.equipment_items || [],
      additional: versionSnapshot?.additional_costs || [],
      risks: versionSnapshot?.risks || [],
      groups: versionSnapshot?.groups || [],
    }),
    [versionSnapshot],
  );

  if (previewOpen) {
    return (
      <Card className="p-4 sm:p-6 border-2 border-border shadow-md text-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              {t("restorePreview")}
            </h3>
            <p className="text-sm text-text-secondary">
              {t("restoreDescription")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPreviewOpen(false)}
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
        {loadingVersionSnapshot || isLoadingCurrent ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <VersionConflictResolver
            currentData={currentData}
            versionData={versionData}
            onResolve={handleResolve}
            onCancel={() => setPreviewOpen(false)}
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

  return (
    <div className="space-y-6 text-sm">
      {canEdit && (
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold text-lg">{t("create")}</h3>
          <div className="flex gap-2">
            <input
              className="border rounded p-2 w-full text-sm"
              placeholder={t("namePlaceholder")}
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              aria-label={t("namePlaceholder")}
            />
            <Button
              onClick={handleCreateVersion}
              className="text-sm"
              disabled={isCreatingVersion || !newVersionName.trim()}
            >
              {isCreatingVersion ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("common:save")
              )}
            </Button>
          </div>
        </Card>
      )}
      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">{t("restore")}</h3>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setManageOpen(true)}
              className="text-text-secondary hover:text-text-primary"
              aria-label={t("manage")}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedVersionId}
            onValueChange={setSelectedVersionId}
            disabled={isLoadingVersions}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder={t("select")} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingVersions ? (
                <SelectItem value="loading" disabled className="text-sm">
                  {t("common:loading")}
                </SelectItem>
              ) : versions.length === 0 ? (
                <SelectItem value="no-versions" disabled className="text-sm">
                  {t("noVersions")}
                </SelectItem>
              ) : (
                versions.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-sm">
                    {v.name} (
                    {new Date(v.created_at).toLocaleDateString(i18n.language)})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button
              variant="outline"
              disabled={
                !selectedVersionId ||
                isLoadingVersions ||
                loadingVersionSnapshot
              }
              onClick={handleViewChanges}
              className="text-sm"
            >
              {loadingVersionSnapshot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("viewChanges")
              )}
            </Button>
          )}
        </div>
      </Card>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("manageTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
            {isLoadingVersions ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <p className="text-center text-text-secondary py-4 text-sm">
                {t("common:noItems")}
              </p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-sm">{v.name}</div>
                    <div className="text-xs text-text-secondary">
                      {t("createdOn")}{" "}
                      {new Date(v.created_at).toLocaleDateString(i18n.language)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setVersionToDelete(v.id)}
                    aria-label={`${t("common:delete")} ${v.name}`}
                    disabled={isDeletingVersion}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManageOpen(false)}
              className="text-sm"
            >
              {t("common:close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={!!versionToDelete}
        onOpenChange={() => setVersionToDelete(null)}
        onConfirm={() =>
          versionToDelete && handleDeleteVersion(versionToDelete)
        }
        itemName={versions.find((v) => v.id === versionToDelete)?.name}
        loading={isDeletingVersion}
      />
    </div>
  );
}
