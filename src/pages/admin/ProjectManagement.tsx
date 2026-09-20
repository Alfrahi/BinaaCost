import { useTranslation } from "react-i18next";
import PageHeader from "@/shared/components/PageHeader";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Trash2, Eye, X, AlertTriangle, ArrowLeft, RotateCcw, ArrowRightLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { PaginationControls } from "@/shared/components/PaginationControls";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import TransferOwnershipModal from "@/features/admin/components/TransferOwnershipModal";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/ui/input";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import {
  useAdminProjectManagement,
  Project,
} from "@/features/admin/hooks/useAdminProjectManagement";
import { useMemo, useState } from "react";

export default function ProjectManagement() {
  const { t, i18n } = useTranslation(["admin", "common", "navigation"]);
  const {
    projects,
    isLoading,
    error,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    activeTab,
    setActiveTab,
    deleteTarget,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleDelete,
    deleteProjectMutation,
    restoreProjectMutation,
    transferOwnershipMutation,
    totalPages,
  } = useAdminProjectManagement();

  const [transferTarget, setTransferTarget] = useState<Project | null>(null);

  const activeColumns = useMemo<DataTableColumn<Project>[]>(
    () => [
      { key: "name", label: t("admin:projects.name") },
      { key: "owner", label: t("admin:projects.owner") },
      { key: "location", label: t("admin:projects.location") },
      { key: "createdAt", label: t("admin:projects.createdAt") },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  const deletedColumns = useMemo<DataTableColumn<Project>[]>(
    () => [
      { key: "name", label: t("admin:projects.name") },
      { key: "owner", label: t("admin:projects.owner") },
      { key: "deletedAt", label: t("admin:projects.deletedAt") },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
        <AlertDescription className="text-sm">{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin" aria-label={t("navigation:adminPanel")}>
                <ArrowLeft
                  className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <span>{t("admin:projects.title")}</span>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="text-sm">
          <TabsTrigger value="active" className="text-sm">
            {t("admin:projects.activeProjects")}
          </TabsTrigger>
          <TabsTrigger value="deleted" className="text-sm">
            {t("admin:projects.deletedProjects")}
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder={t("admin:projects.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("admin:projects.searchPlaceholder")}
              className="text-sm"
            />
            {search && (
              <Button
                variant="ghost"
                onClick={() => setSearch("")}
                className="absolute end-0 top-0 h-full px-3 text-sm"
                aria-label={t("common:clearFilters")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="active" className="mt-4">
          <DataTable
            columns={activeColumns}
            data={projects}
            getRowKey={(project) => project.id}
            renderRow={(project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium text-sm">
                  <Link to={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{project.owner_email}</TableCell>
                <TableCell className="text-sm">
                  {project.location || t("common:notSpecified")}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(project.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild className="text-sm">
                      <Link to={`/projects/${project.id}`}>
                        <Eye className={cn("w-4 h-4", getIconMarginClass())} />
                        {t("common:view")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferTarget(project)}
                      className="text-sm"
                      title={t("admin:projects.transferOwnership")}
                    >
                      <ArrowRightLeft className={cn("w-4 h-4", getIconMarginClass())} />
                      <span className="hidden sm:inline">{t("admin:projects.transferOwnership")}</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(project)}
                      className="text-sm"
                    >
                      <Trash2 className={cn("w-4 h-4", getIconMarginClass())} />
                      {t("common:delete")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            isLoading={isLoading}
            emptyMessage={t("admin:projects.noProjectsFound")}
            ariaLabel={t("admin:projects.activeProjects")}
          />
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          <DataTable
            columns={deletedColumns}
            data={projects}
            getRowKey={(project) => project.id}
            renderRow={(project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium text-sm">{project.name}</TableCell>
                <TableCell className="text-sm">{project.owner_email}</TableCell>
                <TableCell className="text-sm">
                  {project.deleted_at
                    ? new Date(project.deleted_at).toLocaleDateString()
                    : t("common:notSpecified")}
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreProjectMutation.mutate(project.id)}
                      disabled={restoreProjectMutation.isPending}
                      className="text-sm"
                    >
                      <RotateCcw className={cn("w-4 h-4", getIconMarginClass())} />
                      {t("admin:projects.restore")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(project)}
                      className="text-sm"
                    >
                      <Trash2 className={cn("w-4 h-4", getIconMarginClass())} />
                      {t("admin:projects.permanentDelete")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            isLoading={isLoading}
            emptyMessage={t("admin:projects.noDeletedProjectsFound")}
            ariaLabel={t("admin:projects.deletedProjects")}
          />
        </TabsContent>
      </Tabs>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() =>
          deleteTarget && deleteProjectMutation.mutate(deleteTarget.id)
        }
        title={t("admin:projects.deleteConfirmationTitle")}
        body={
          deleteTarget?.deleted_at
            ? t("admin:projects.permanentDeleteWarning", {
                projectName: deleteTarget.name,
              })
            : t("admin:projects.deleteWarning", {
                projectName: deleteTarget?.name,
              })
        }
        confirmLabel={
          deleteProjectMutation.isPending
            ? t("common:deleting")
            : t("common:delete")
        }
        loading={deleteProjectMutation.isPending}
        destructive
      />

      <TransferOwnershipModal
        project={transferTarget}
        open={!!transferTarget}
        onOpenChange={(open) => !open && setTransferTarget(null)}
        onTransfer={(newUserId) => {
          if (transferTarget) {
            transferOwnershipMutation.mutate(
              { projectId: transferTarget.id, newUserId },
              { onSuccess: () => setTransferTarget(null) },
            );
          }
        }}
        loading={transferOwnershipMutation.isPending}
      />
    </div>
  );
}
