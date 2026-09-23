import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "@/shared/components/PageHeader";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { Calendar, Activity, AlertTriangle, ArrowLeft, Edit } from "lucide-react";
import LoadingState from "@/shared/components/ui/LoadingState";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { PaginationControls } from "@/shared/components/PaginationControls";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import {
  RoleBadge,
  useAdminUserProjects,
  useAdminUserAuditLogs,
  useAdminUserDetails,
  useAdminUserManagement,
  EditUserModal,
} from "@/features/admin";

const formatJsonForDisplay = (data: any) => {
  if (!data) return null;
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
};

export default function UserDetails() {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const { formatDate } = useDateFormatter();
  const { userId } = useParams();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { updateUserMutation, sendPasswordResetMutation } =
    useAdminUserManagement();

  const {
    user,
    loadingUser,
    userError,
  } = useAdminUserDetails(userId);

  const {
    projects,
    isLoading: loadingProjects,
    error: projectsError,
    currentPage: projectsCurrentPage,
    setCurrentPage: setProjectsCurrentPage,
    totalPages: totalProjectPages,
  } = useAdminUserProjects(userId);

  const {
    logs,
    isLoading: loadingLogs,
    error: logsError,
  } = useAdminUserAuditLogs(userId);

  if (loadingUser) {
    return <LoadingState className="h-64" />;
  }

  if (userError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
        <AlertDescription className="text-sm">{userError.message}</AlertDescription>
      </Alert>
    );
  }

  if (!user) {
    return <EmptyState message={t("admin:users.userNotFound")} />;
  }

  return (
    <div className="space-y-6 text-sm">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/users" aria-label={t("admin:users.title")}>
                <ArrowLeft
                  className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <span>{t("admin:users.userDetails")}</span>
          </div>
        }
        actions={
          <Button
            onClick={() => setIsEditOpen(true)}
            className="text-sm"
          >
            <Edit className={cn("w-4 h-4", getIconMarginClass())} />
            {t("admin:users.editUser")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>
              {t("admin:users.userDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <span className="text-xl font-medium text-foreground">
                  {user.first_name?.charAt(0)}
                  {user.last_name?.charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-medium text-sm text-foreground">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {sanitizeText(user.email)}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <RoleBadge role={user.role} />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {t("admin:users.accountCreated")}:{" "}
                  {formatDate(user.created_at, "short")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span>
                  {t("admin:users.lastSignIn")}:{" "}
                  {user.last_sign_in_at
                    ? formatDate(user.last_sign_in_at, "dateTime")
                    : t("admin:users.never")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="projects">
            <TabsList className="text-sm">
              <TabsTrigger value="projects" className="text-sm">
                {t("admin:users.projects")}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-sm">
                {t("admin:users.activity")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-4">
              <CardHeader>
                <CardTitle>
                  {t("admin:users.projects")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProjects ? (
                  <LoadingState />
                ) : projectsError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
                    <AlertDescription className="text-sm">{projectsError.message}</AlertDescription>
                  </Alert>
                ) : projects?.length === 0 ? (
                  <EmptyState message={t("admin:users.noProjectsFound")} />
                ) : (
                  <>
                    <div className="space-y-3">
                      {projects?.map((project) => (
                        <Link
                          key={project.id}
                          to={`/projects/${project.id}`}
                          className="block p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="font-medium text-sm text-foreground">
                            {project.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("admin:users.createdAt")}:{" "}
                            {formatDate(project.created_at, "short")}
                          </div>
                          {project.deleted_at && (
                            <div className="text-destructive text-sm">
                              {t("admin:users.deletedAt")}:{" "}
                              {formatDate(project.deleted_at, "short")}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-4">
                      <PaginationControls
                        currentPage={projectsCurrentPage}
                        totalPages={totalProjectPages}
                        onPageChange={setProjectsCurrentPage}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <CardHeader>
                <CardTitle>
                  {t("admin:users.activity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <LoadingState />
                ) : logsError ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
                    <AlertDescription className="text-sm">{logsError.message}</AlertDescription>
                  </Alert>
                ) : logs?.length === 0 ? (
                  <EmptyState message={t("admin:users.noActivityFound")} />
                ) : (
                  <div className="space-y-4">
                    {logs?.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 border border-border rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm text-foreground">
                              {log.action}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.table_name} •{" "}
                              {formatDate(log.created_at, "dateTime")}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          {log.old_data && (
                            <div className="text-destructive">
                              <strong>{t("admin:users.oldData")}:</strong>{" "}
                              {formatJsonForDisplay(log.old_data)}
                            </div>
                          )}
                          {log.new_data && (
                            <div className="text-success">
                              <strong>{t("admin:users.newData")}:</strong>{" "}
                              {formatJsonForDisplay(log.new_data)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <EditUserModal
        user={
          user
            ? {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                created_at: user.created_at,
              }
            : null
        }
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSave={async (data) => {
          await updateUserMutation.mutateAsync(data);
        }}
        onSendPasswordReset={async (email) => {
          await sendPasswordResetMutation.mutateAsync(email);
        }}
        loading={updateUserMutation.isPending}
      />
    </div>
  );
}
