import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { format } from "date-fns";
import {
  useProjectSharing,
  ProjectShare,
  ExternalShareLink,
} from "@/hooks/useProjectSharing";
import { AddInternalShareForm } from "./internal-sharing/AddInternalShareForm";
import { EditInternalShareRow } from "./internal-sharing/EditInternalShareRow";
import { GenerateExternalLinkForm } from "./external-sharing/GenerateExternalLinkForm";
import {
  FinancialAssumptionsStrip,
  DefaultAssumptionsWarning,
} from "./FinancialAssumptions";
import { FinancialSettings } from "@/logic/financials";

interface ShareProjectDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  financialSettings?: FinancialSettings;
  settingsConfirmed?: boolean;
}

export default function ShareProjectDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
  financialSettings,
  settingsConfirmed,
}: ShareProjectDialogProps) {
  const { t } = useTranslation(["project_detail", "common", "roles"]);

  const [editingShare, setEditingShare] = useState<ProjectShare | null>(null);
  const [deleteTargetInternal, setDeleteTargetInternal] =
    useState<ProjectShare | null>(null);
  const [deleteTargetExternal, setDeleteTargetExternal] =
    useState<ExternalShareLink | null>(null);

  const {
    internalShares,
    externalLinks,
    isLoadingInternalShares,
    isLoadingExternalLinks,
    isAddingInternalShare,
    isUpdatingInternalShare,
    isDeletingInternalShare,
    isGeneratingExternalLink,
    isDeletingExternalLink,
    addInternalShare,
    updateInternalShare,
    deleteInternalShare,
    generateExternalLink,
    deleteExternalLink,
  } = useProjectSharing(projectId);

  const handleAddInternalShare = async (
    email: string,
    role: "viewer" | "editor",
  ) => {
    await addInternalShare({ email, role });
  };

  const handleSaveEditedInternalShare = async (
    shareId: string,
    newRole: "viewer" | "editor",
  ) => {
    await updateInternalShare({ shareId, newRole });
    setEditingShare(null);
  };

  const handleCancelEditInternalShare = () => {
    setEditingShare(null);
  };

  const handleDeleteInternalShareConfirmation = (share: ProjectShare) => {
    setDeleteTargetInternal(share);
  };

  const handleConfirmDeleteInternalShare = async () => {
    if (!deleteTargetInternal) return;
    await deleteInternalShare(deleteTargetInternal.share_id);
    setDeleteTargetInternal(null);
  };

  const handleGenerateExternalLink = async (
    expiresAt: string,
    password?: string,
  ) => {
    return await generateExternalLink({ expiresAt, password });
  };

  const handleConfirmDeleteExternalLink = async () => {
    if (!deleteTargetExternal) return;
    await deleteExternalLink(deleteTargetExternal.id);
    setDeleteTargetExternal(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("project_detail:share.shareProject", { projectName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <div className="space-y-3">
            {settingsConfirmed !== true && (
              <DefaultAssumptionsWarning
                project={{ financial_settings_confirmed: false }}
              />
            )}
            {financialSettings && (
              <FinancialAssumptionsStrip settings={financialSettings} />
            )}
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {t("project_detail:share.internalSharing")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("project_detail:share.internalSharingDescription")}
            </p>
            <AddInternalShareForm
              isAdding={isAddingInternalShare}
              onAdd={handleAddInternalShare}
            />

            <div>
              <h4 className="font-semibold text-base mb-2">
                {t("project_detail:share.existingShares")}
              </h4>
              {isLoadingInternalShares ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : internalShares.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  {t("project_detail:share.noShares")}
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("project_detail:share.user")}
                        </th>
                        <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("project_detail:share.role")}
                        </th>
                        <th className="px-4 py-2 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("common:actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {internalShares.map((share) => (
                        <EditInternalShareRow
                          key={share.share_id}
                          share={share}
                          isEditing={editingShare?.share_id === share.share_id}
                          isUpdating={isUpdatingInternalShare}
                          onEdit={setEditingShare}
                          onSave={handleSaveEditedInternalShare}
                          onCancelEdit={handleCancelEditInternalShare}
                          onDelete={handleDeleteInternalShareConfirmation}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <GenerateExternalLinkForm
            isGenerating={isGeneratingExternalLink}
            onGenerate={handleGenerateExternalLink}
          />

          <div className="mt-6">
            <h4 className="font-semibold text-base mb-2">
              {t("project_detail:share.external.existingLinks")}
            </h4>
            {isLoadingExternalLinks ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : externalLinks.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                {t("project_detail:share.external.noLinks")}
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("project_detail:share.external.link")}
                      </th>
                      <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("project_detail:share.external.expires")}
                      </th>
                      <th className="px-4 py-2 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("common:actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {externalLinks.map((link) => (
                      <tr key={link.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 italic">
                          {t("project_detail:share.external.linkHiddenNote")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(link.expires_at), "MMM dd, yyyy")}
                          {new Date(link.expires_at) < new Date() && (
                            <span className="ms-2 text-red-500 text-xs">
                              ({t("project_detail:share.external.expired")})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-end text-sm font-medium">
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteTargetExternal(link)}
                            className="h-7 w-7"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-sm"
          >
            {t("common:close")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <DeleteConfirmationDialog
        open={!!deleteTargetInternal}
        onOpenChange={() => setDeleteTargetInternal(null)}
        onConfirm={handleConfirmDeleteInternalShare}
        itemName={deleteTargetInternal?.email}
        loading={isDeletingInternalShare}
      />

      <DeleteConfirmationDialog
        open={!!deleteTargetExternal}
        onOpenChange={() => setDeleteTargetExternal(null)}
        onConfirm={handleConfirmDeleteExternalLink}
        itemName={t("project_detail:share.external.link")}
        loading={isDeletingExternalLink}
      />
    </Dialog>
  );
}
