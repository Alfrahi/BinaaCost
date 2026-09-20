import { useParams, Link, useNavigate } from "react-router-dom";
import PageLoader from "@/shared/components/PageLoader";
import ProjectTabs from "@/features/projects/project-core/components/ProjectTabs";
import PageHeader from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import EmptyState from "@/shared/components/ui/EmptyState";
import { ArrowLeft, Share2, Edit, Trash2, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProjectData } from "@/features/projects/project-core/hooks/useProjectData";
import { useState, useEffect } from "react";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import ShareProjectDialog from "@/features/projects/project-sharing/components/ShareProjectDialog";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { useSoftDeleteProject } from "@/features/projects/project-core/hooks/useSoftDeleteProject";
import { useCloneProject } from "@/features/projects/project-core/hooks/useCloneProject";
import { offlineManager } from "@/shared/lib/offline";

export default function ProjectDetail() {
  const { t, i18n } = useTranslation(["project_detail", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, isLoading, isOwner, canEdit } = useProjectData(id);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const softDeleteMutation = useSoftDeleteProject();
  const cloneMutation = useCloneProject();

  useEffect(() => {
    return offlineManager.onSyncEvent((event) => {
      if (
        event.type === "id_remapped" &&
        event.table === "projects" &&
        event.oldId === id
      ) {
        navigate(`/projects/${event.newId}`, { replace: true });
      }
    });
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await softDeleteMutation.mutateAsync(id);
      setDeleteDialogOpen(false);
      navigate("/");
    } catch {
      // Error handled by mutation onError
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!project) {
    return <EmptyState message={t("project_detail:notFound")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/" aria-label={t("common:backToDashboard")}>
                <ArrowLeft
                  className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <span>{project.name}</span>
          </div>
        }
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" asChild className="text-sm">
                <Link to={`/projects/${id}/edit`}>
                  <Edit className={cn("w-4 h-4", getIconMarginClass())} />
                  {t("common:edit")}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => cloneMutation.mutate({ projectId: id! })}
              disabled={cloneMutation.isPending}
              className="text-sm"
            >
              <Copy className={cn("w-4 h-4", getIconMarginClass())} />
              {cloneMutation.isPending
                ? t("common:duplicating")
                : t("common:duplicate")}
            </Button>
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShareDialogOpen(true)}
                  className="text-sm"
                >
                  <Share2 className={cn("w-4 h-4", getIconMarginClass())} />
                  {t("project_detail:share.share")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-sm"
                >
                  <Trash2 className={cn("w-4 h-4", getIconMarginClass())} />
                  {t("common:delete")}
                </Button>
              </>
            )}
          </div>
        }
      />

      <ProjectTabs projectId={id!} canEdit={canEdit} />

      {isOwner && project && (
        <ShareProjectDialog
          projectId={project.id}
          projectName={project.name}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          financialSettings={project.financial_settings}
          settingsConfirmed={project.financial_settings_confirmed}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={project.name}
        loading={softDeleteMutation.isPending}
      />
    </div>
  );
}
