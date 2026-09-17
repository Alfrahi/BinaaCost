import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import ProfileSettings from "@/shared/components/ProfileSettings";
import ReportOptionsSection from "@/shared/components/ReportOptionsSection";
import PageHeader from "@/shared/components/PageHeader";
import { useTranslation } from "react-i18next";
import { User, FileText, Bell } from "lucide-react";
import NotificationsSection from "@/shared/components/NotificationsSection";
import { useIsMobile } from "@/shared/hooks/useMobile";
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

  const tabItems = useMemo(
    () => [
      { value: "profile", labelKey: "settings:profile.title", icon: User },
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
              <SelectValue placeholder={t("settings:selectCategory")} />
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
