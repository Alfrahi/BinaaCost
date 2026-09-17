import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  Library,
  AreaChart,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation("navigation");

  const navItems = [
    { name: t("dashboard"), path: "/", icon: LayoutDashboard },
    { name: t("analytics"), path: "/analytics", icon: AreaChart },
    { name: t("costLibrary"), path: "/cost-library", icon: Library },
    { name: t("settings"), path: "/settings", icon: Settings },
  ];

  return (
    <nav
      className="flex justify-around bg-muted border-t border-border py-2 overflow-x-auto"
      aria-label={t("mobileNavigation")}
    >
      {navItems.map(({ path, name, icon: Icon }) => {
        const active =
          location.pathname === path ||
          (path !== "/" && location.pathname.startsWith(path));

        return (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center gap-1 text-xs font-medium py-1 px-2 transition-colors ${
              active ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
            aria-label={name}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="w-6 h-6" aria-hidden="true" />
            <span className="leading-none whitespace-nowrap">{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
