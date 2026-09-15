import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";

const fetchProjectName = async (projectId: string) => {
  if (!projectId) return null;
  try {
    const record = await pb.collection("projects").getOne(projectId);
    return { name: record.name as string };
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
};

export default function Breadcrumbs() {
  const location = useLocation();
  const { t, i18n } = useTranslation([
    "dashboard",
    "project_detail",
    "navigation",
    "admin",
    "common",
  ]);
  const params = useParams();
  const segments = location.pathname.split("/").filter(Boolean);

  const projectId = params.id;
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ["projectNameForBreadcrumb", projectId],
    queryFn: () => fetchProjectName(projectId!),
    enabled: !!projectId && segments.includes(projectId),
    staleTime: 5 * 60 * 1000,
  });

  if (segments.length === 0) return null;

  const separator = i18n.dir() === "rtl" ? "‹" : "›";

  const pathSegmentTranslations: Record<string, string> = {
    projects: "dashboard:title",
    new: "dashboard:createNew",
    edit: "project_detail:editDetails",
    settings: "navigation:settings",
    admin: "navigation:adminPanel",
    "cost-databases": "navigation:costDatabases",
    "data-import": "navigation:importData",
    assemblies: "navigation:assemblies",
    analytics: "navigation:analytics",
    users: "admin:users.title",
    resources: "navigation:resources",
    "app-settings": "admin:appSettings.title",
    "audit-logs": "admin:auditLogs.title",
    subscriptions: "admin:subscriptionManagement.title",
  };

  return (
    <nav className="text-sm text-muted-foreground mb-2" aria-label={t("common:breadcrumb")}>
      <ol className="flex flex-wrap gap-1 items-center">
        <li>
          <Link to="/" className="hover:underline">
            {t("common:home")}
          </Link>
        </li>
        {segments.map((seg, idx) => {
          const path = `/${segments.slice(0, idx + 1).join("/")}`;
          const isLast = idx === segments.length - 1;

          let translatedSeg: string;

          if (projectId && seg === projectId) {
            if (isLoadingProject) {
              translatedSeg = "...";
            } else if (project) {
              translatedSeg = project.name;
            } else {
              translatedSeg = seg;
            }
          } else {
            const translationKey = pathSegmentTranslations[seg];
            if (translationKey) {
              const translation = t(translationKey);
              if (translation !== translationKey) {
                translatedSeg = translation;
              } else {
                translatedSeg = decodeURIComponent(seg)
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());
              }
            } else {
              translatedSeg = decodeURIComponent(seg)
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
            }
          }

          return (
            <li key={idx} className="flex items-center gap-1">
              <span>{separator}</span>
              {isLast ? (
                <span className="font-semibold text-foreground">
                  {translatedSeg}
                </span>
              ) : (
                <Link to={path} className="hover:underline">
                  {translatedSeg}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
