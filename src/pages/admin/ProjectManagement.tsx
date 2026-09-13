import { useTranslation } from "react-i18next";
import PageHeader from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, Loader2, X, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaginationControls } from "@/components/PaginationControls";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn, getIconMarginClass } from "@/lib/utils";
import { useAdminProjectManagement } from "@/hooks/useAdminProjectManagement";

export default function ProjectManagement() {
  const { t } = useTranslation(["admin", "common"]);
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
    totalPages,
  } = useAdminProjectManagement();

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
      <PageHeader title={t("admin:projects.title")} />

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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start text-xs">
                    {t("admin:projects.name")}
                  </TableHead>
                  <TableHead className="text-start text-xs">
                    {t("admin:projects.owner")}
                  </TableHead>
                  <TableHead className="text-start text-xs">
                    {t("admin:projects.location")}
                  </TableHead>
                  <TableHead className="text-start text-xs">
                    {t("admin:projects.createdAt")}
                  </TableHead>
                  <TableHead className="text-end text-xs">
                    {t("common:actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-sm">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : projects?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      {t("admin:projects.noProjectsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  projects?.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium text-sm">
                        <Link
                          to={`/projects/${project.id}`}
                          className="hover:underline"
                        >
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {project.owner_email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {project.location || t("common:notSpecified")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(project.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="text-sm"
                          >
                            <Link to={`/projects/${project.id}`}>
                              <Eye
                                className={cn("w-4 h-4", getIconMarginClass())}
                              />
                              {t("common:view")}
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(project)}
                            className="text-sm"
                          >
                            <Trash2
                              className={cn("w-4 h-4", getIconMarginClass())}
                            />
                            {t("common:delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start text-xs">
                    {t("admin:projects.name")}
                  </TableHead>
                  <TableHead className="text-start text-xs">
                    {t("admin:projects.owner")}
                  </TableHead>
                  <TableHead className="text-start text-xs">
                    {t("admin:projects.deletedAt")}
                  </TableHead>
                  <TableHead className="text-end text-xs">
                    {t("common:actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-sm">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : projects?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      {t("admin:projects.noDeletedProjectsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  projects?.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium text-sm">
                        {project.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {project.owner_email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {project.deleted_at
                          ? new Date(project.deleted_at).toLocaleDateString()
                          : t("common:notSpecified")}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(project)}
                            className="text-sm"
                          >
                            <Trash2
                              className={cn("w-4 h-4", getIconMarginClass())}
                            />
                            {t("admin:projects.permanentDelete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              {t("admin:projects.deleteConfirmationTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {deleteTarget?.deleted_at
                ? t("admin:projects.permanentDeleteWarning", {
                    projectName: deleteTarget.name,
                  })
                : t("admin:projects.deleteWarning", {
                    projectName: deleteTarget?.name,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteProjectMutation.mutate(deleteTarget.id)
              }
              disabled={deleteProjectMutation.isPending}
              className="text-sm"
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2
                    className={cn(
                      "w-4 h-4",
                      getIconMarginClass(),
                      "animate-spin",
                    )}
                  />
                  {t("common:deleting")}
                </>
              ) : (
                t("common:delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
