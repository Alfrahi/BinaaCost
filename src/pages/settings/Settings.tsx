import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import ProfileSettings from "@/features/settings/components/ProfileSettings";
import ReportOptionsSection from "@/features/reports/components/ReportOptionsSection";
import PageHeader from "@/shared/components/PageHeader";
import { useTranslation } from "react-i18next";
import { User, FileText, Bell, Palette, Sun, Moon } from "lucide-react";
import NotificationsSection from "@/shared/components/NotificationsSection";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { useTheme } from "@/app/providers/ThemeContext";
import { cn } from "@/shared/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

export default function Settings() {
  const { t } = useTranslation(["settings", "common"]);
  const [activeTab, setActiveTab] = useState("profile");
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  const tabItems = useMemo(
    () => [
      { value: "profile", labelKey: "settings:profile.title", icon: User },
      {
        value: "appearance",
        labelKey: "settings:appearance.title",
        icon: Palette,
      },
      {
        value: "reports",
        labelKey: "settings:reportOptions.title",
        icon: FileText,
      },
      {
        value: "notifications",
        labelKey: "settings:notifications.title",
        icon: Bell,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings:title")} />

      <Tabs
        defaultValue="profile"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full text-sm mb-4">
              <SelectValue placeholder={t("settings:selectCategory")}>
                {(() => {
                  const activeItem = tabItems.find((item) => item.value === activeTab);
                  return activeItem ? t(activeItem.labelKey) : undefined;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="text-sm"
                >
                  {t(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <TabsList className="w-full justify-start">
              {tabItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
        )}

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:profile.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:appearance.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-1">
                  {t("settings:appearance.theme")}
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("settings:appearance.themeDesc")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 text-start transition-all cursor-pointer",
                      theme === "light"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-border/80",
                    )}
                  >
                    <Sun className="h-6 w-6 text-amber-500" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {t("settings:appearance.lightMode")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("settings:appearance.lightModeDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 text-start transition-all cursor-pointer",
                      theme === "dark"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-border/80",
                    )}
                  >
                    <Moon className="h-6 w-6 text-indigo-400" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {t("settings:appearance.darkMode")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("settings:appearance.darkModeDesc")}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:reportOptions.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportOptionsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings:notifications.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationsSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
