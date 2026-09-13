import { useParams, Link } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import ProjectTabs from "@/components/project/ProjectTabs";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ArrowLeft, Share2, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProjectData } from "@/features/project/useProjectData";
import { useState } from "react";
import { cn, getIconMarginClass } from "@/lib/utils";
import ShareProjectDialog from "@/components/project/ShareProjectDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useSoftDeleteProject } from "@/hooks/useSoftDeleteProject";

export default function ProjectDetail() {
  const { t, i18n } = useTranslation(["project_detail", "common"]);
  const { id } = useParams();
  const { project, isLoading, isOwner, canEdit } = useProjectData(id);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const softDeleteMutation = useSoftDeleteProject();

  const handleDelete = async () => {
    if (!id) return;
    softDeleteMutation.mutate(id);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!project) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("project_detail:notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/" aria-label={t("common:backToDashboard")}>
              <ArrowLeft
                className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
                aria-hidden="true"
              />
            </Link>
          </Button>
          <Heading level={1}>{project.name}</Heading>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" asChild className="text-sm">
              <Link to={`/projects/${id}/edit`}>
                <Edit className={cn("w-4 h-4", getIconMarginClass())} />
                {t("common:edit")}
              </Link>
            </Button>
          )}
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
      </div>

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
