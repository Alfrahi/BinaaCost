import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Link } from "react-router-dom";
import {
  Users,
  SlidersHorizontal,
  FolderKanban,
  FileText,
  Settings,
  Archive,
  Activity,
  CheckCircle2,
} from "lucide-react";
import PageHeader from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAdminStats } from "@/features/admin/hooks/useAdminStats";

export default function AdminPanel() {
  const { t } = useTranslation(["admin", "common"]);
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  const statCards = [
    {
      label: t("admin:stats.totalUsers"),
      value: stats?.totalUsers,
      icon: Users,
      path: "/admin/users",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      label: t("admin:stats.activeProjects"),
      value: stats?.activeProjects,
      icon: FolderKanban,
      path: "/admin/projects",
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: t("admin:stats.deletedProjects"),
      value: stats?.deletedProjects,
      icon: Archive,
      path: "/admin/projects",
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: t("admin:stats.auditEvents"),
      value: stats?.totalAuditLogs,
      icon: Activity,
      path: "/admin/audit-logs",
      color: "text-purple-500 bg-purple-500/10",
    },
  ];

  const adminSections = [
    {
      title: t("admin:users.title"),
      description: t("admin:users.description"),
      icon: Users,
      path: "/admin/users",
    },
    {
      title: t("admin:projects.title"),
      description: t("admin:projects.description"),
      icon: FolderKanban,
      path: "/admin/projects",
    },
    {
      title: t("admin:dropdowns.title"),
      description: t("admin:dropdowns.description"),
      icon: SlidersHorizontal,
      path: "/admin/settings",
    },
    {
      title: t("admin:appSettings.title"),
      description: t("admin:appSettings.description"),
      icon: Settings,
      path: "/admin/app-settings",
    },
    {
      title: t("admin:auditLogs.title"),
      description: t("admin:auditLogs.description"),
      icon: FileText,
      path: "/admin/audit-logs",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin:title")}
        actions={
          <Badge
            variant="outline"
            className="gap-1.5 py-1 px-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("admin:stats.systemOnline")}
          </Badge>
        }
      />

      {/* Live System KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Link key={idx} to={stat.path} className="block group">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                  <div className="text-2xl font-bold tracking-tight">
                    {statsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      stat.value ?? 0
                    )}
                  </div>
                </div>
                <div
                  className={`p-2.5 rounded-lg ${stat.color} group-hover:scale-105 transition-transform`}
                >
                  <stat.icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="pt-2">
        <h2 className="text-base font-semibold mb-4 text-foreground">
          {t("admin:stats.overview")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link
              key={section.path}
              to={section.path}
              className="block"
              aria-label={section.title}
            >
              <Card className="h-full hover:shadow-lg hover:border-primary/40 transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <section.icon className="w-6 h-6 text-primary" />
                    <span>{section.title}</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {section.description}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
