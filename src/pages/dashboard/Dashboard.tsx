import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import PageHeader from "@/shared/components/PageHeader";
import EmptyState from "@/shared/components/ui/EmptyState";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { PaginationControls } from "@/shared/components/PaginationControls";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Folder, Users } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Link } from "react-router-dom";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecord } from "@/integrations/pocketbase/mappers";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { STALE_TIME } from "@/shared/lib/queryDefaults";
import { useMyProjects } from "@/features/projects/project-core/hooks/useMyProjects";
import { useSharedProjects } from "@/features/projects/project-core/hooks/useSharedProjects";
import { ProjectCard } from "@/features/projects/project-core/components/ProjectCard";

export default function Dashboard() {
  const { t } = useTranslation(["dashboard", "common"]);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");

  const {
    myProjects,
    isLoadingMyProjects,
    myProjectsError,
    myProjectsCurrentPage,
    setMyProjectsCurrentPage,
    totalMyProjectsPages,
    totalMyProjectsCount,
    itemsPerPage,
  } = useMyProjects(searchTerm);

  const {
    sharedProjects,
    isLoadingSharedProjects,
    sharedProjectsError,
    sharedProjectsCurrentPage,
    setSharedProjectsCurrentPage,
    totalSharedProjectsPages,
    totalSharedProjectsCount,
  } = useSharedProjects(searchTerm);

  const prefetchProjectData = (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["project", projectId],
      queryFn: async () =>
        mapRecord(await pb.collection("projects").getOne(projectId)),
      staleTime: STALE_TIME.ENTITY,
    });
  };

  useEffect(() => {
    if (myProjectsError) {
      toast.error(
        t("common:errorLoadingProjects", { message: myProjectsError.message }),
      );
    }
    if (sharedProjectsError) {
      toast.error(
        t("common:errorLoadingProjects", {
          message: sharedProjectsError.message,
        }),
      );
    }
  }, [myProjectsError, sharedProjectsError, t]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard:title")} />

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex-1 w-full">
          <Input
            placeholder={t("dashboard:searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
        </div>
        <Button asChild className="text-sm">
          <Link to="/projects/new">
            <Plus className={cn("w-4 h-4", getIconMarginClass())} />
            {t("dashboard:createNew")}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row justify-between items-center space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              {t("dashboard:myProjects")}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {totalMyProjectsCount} {t("dashboard:projects")}
            </span>
          </CardHeader>
          <CardContent>
            {isLoadingMyProjects ? (
            <div className="space-y-3">
              {[...Array(itemsPerPage)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : myProjects?.length === 0 ? (
            <EmptyState
              message={t("dashboard:noProjects")}
              action={
                <Button asChild className="text-sm">
                  <Link to="/projects/new">
                    <Plus className={cn("w-4 h-4", getIconMarginClass())} />
                    {t("dashboard:createFirstProject")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {myProjects?.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  updatedAt={project.updated_at}
                  currency={project.currency}
                  financialSettings={project.financial_settings}
                  onPrefetch={prefetchProjectData}
                />
              ))}
            </div>
          )}
          {totalMyProjectsPages > 1 && (
            <PaginationControls
              currentPage={myProjectsCurrentPage}
              totalPages={totalMyProjectsPages}
              onPageChange={setMyProjectsCurrentPage}
            />
          )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row justify-between items-center space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("dashboard:sharedWithMe")}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {totalSharedProjectsCount} {t("dashboard:projects")}
            </span>
          </CardHeader>
          <CardContent>
            {isLoadingSharedProjects ? (
            <div className="space-y-3">
              {[...Array(itemsPerPage)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sharedProjects?.length === 0 ? (
            <EmptyState message={t("dashboard:noSharedProjects")} />
          ) : (
            <div className="space-y-3">
              {sharedProjects?.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  updatedAt={project.updated_at}
                  currency={project.currency}
                  financialSettings={project.financial_settings}
                  isShared
                  sharedBy={project.owner_email}
                  sharedRole={project.shared_role}
                  onPrefetch={prefetchProjectData}
                />
              ))}
            </div>
          )}
          {totalSharedProjectsPages > 1 && (
            <PaginationControls
              currentPage={sharedProjectsCurrentPage}
              totalPages={totalSharedProjectsPages}
              onPageChange={setSharedProjectsCurrentPage}
            />
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
