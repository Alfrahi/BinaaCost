import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  FolderKanban,
  Package,
  Settings,
  BarChart,
  Users,
  SlidersHorizontal,
  LogOut,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import { useAuth } from "@/features/auth";
import { useRole } from "@/features/auth";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/useMobile";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { t, i18n } = useTranslation(["navigation", "common", "admin"]);
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const isMobile = useIsMobile();
  const isRtl = i18n.dir() === "rtl";

  const navigation = [
    { name: t("navigation:dashboard"), href: "/", icon: Home },
    {
      name: t("navigation:costLibrary"),
      href: "/cost-library",
      icon: Package,
    },
    { name: t("navigation:analytics"), href: "/analytics", icon: BarChart },
    { name: t("navigation:settings"), href: "/settings", icon: Settings },
  ];

  const adminNavigation = [
    {
      name: t("admin:appSettings.title"),
      href: "/admin/app-settings",
      icon: Settings,
    },
    { name: t("admin:users.title"), href: "/admin/users", icon: Users },
    {
      name: t("admin:projects.title"),
      href: "/admin/projects",
      icon: FolderKanban,
    },
    {
      name: t("admin:dropdowns.title"),
      href: "/admin/settings",
      icon: SlidersHorizontal,
    },
    {
      name: t("admin:auditLogs.title"),
      href: "/admin/audit-logs",
      icon: FileText,
    },
  ];

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-fixed bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      <div
        className={cn(
          "fixed inset-y-0 z-sticky bg-card transform transition-all duration-200 ease-in-out",
          isMobile ? "w-64" : isCollapsed ? "w-20" : "w-64",
          "start-0 border-e border-border",
          sidebarOpen
            ? "translate-x-0"
            : isRtl
              ? "translate-x-full"
              : "-translate-x-full",
          "md:translate-x-0 md:static md:inset-auto md:flex md:flex-col",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between border-b border-border",
            isCollapsed ? "px-2" : "px-6",
          )}
        >
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2 text-lg font-semibold text-primary",
              isCollapsed && "justify-center w-full",
            )}
          >
            {!isCollapsed || isMobile ? (
              <img
                src="/logo.svg"
                alt={t("common:appTitle")}
                className="h-8 w-auto"
              />
            ) : (
              <Home className="h-6 w-6" />
            )}
            {(!isCollapsed || isMobile) && (
              <span className={cn(isCollapsed && "hidden")}>
                {t("common:appTitle")}
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label={t("common:close")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-0",
                )}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <item.icon
                  className={cn("h-4 w-4", isCollapsed && "mx-auto")}
                />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">{item.name}</span>
                )}
              </Link>
            ))}
          </nav>

          {(isAdmin || isSuperAdmin) && (
            <>
              <Separator className="my-4 bg-border" />
              {!isCollapsed && (
                <Heading level={6} className="px-4 uppercase tracking-wider text-muted-foreground mb-2">
                  {t("navigation:adminPanel")}
                </Heading>
              )}
              <nav className="space-y-1 px-4">
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-muted text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed && "justify-center px-0",
                    )}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <item.icon
                      className={cn("h-4 w-4", isCollapsed && "mx-auto")}
                    />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap">{item.name}</span>
                    )}
                  </Link>
                ))}
              </nav>
            </>
          )}

          <Separator className="my-4 bg-border" />
          <div className="px-4">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed && "justify-center px-0",
              )}
              onClick={() => signOut()}
            >
              <LogOut
                className={cn("h-4 w-4", isCollapsed ? "mx-auto" : "me-3")}
              />
              {!isCollapsed && (
                <span className="whitespace-nowrap">{t("common:logout")}</span>
              )}
            </Button>
          </div>
        </ScrollArea>
        {!isMobile && (
          <div
            className={cn(
              "border-t border-border p-2",
              isCollapsed && "flex justify-center",
            )}
          >
            <Button
              variant="ghost"
              size={isCollapsed ? "icon" : "default"}
              className={cn(
                "w-full",
                isCollapsed ? "w-10 h-10" : "justify-start",
              )}
              onClick={toggleCollapse}
              aria-label={
                isCollapsed
                  ? t("common:expandSidebar")
                  : t("common:collapseSidebar")
              }
            >
              {isRtl ? (
                isCollapsed ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className={cn("h-5 w-5", getIconMarginClass())} />
                )
              ) : isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className={cn("h-5 w-5", getIconMarginClass())} />
              )}
              {!isCollapsed && (
                <span className="whitespace-nowrap">
                  {t("common:collapseSidebar")}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
