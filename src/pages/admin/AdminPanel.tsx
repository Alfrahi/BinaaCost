import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "react-router-dom";
import {
  Users,
  SlidersHorizontal,
  FolderKanban,
  FileText,
  Settings,
} from "lucide-react";
import PageHeader from "@/shared/components/PageHeader";

export default function AdminPanel() {
  const { t } = useTranslation(["admin", "common"]);

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
      <PageHeader title={t("admin:title")} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <Link
            key={section.path}
            to={section.path}
            className="block"
            aria-label={section.title}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <section.icon className="w-6 h-6" />
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
  );
}
