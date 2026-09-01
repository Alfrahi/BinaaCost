import { useState, useEffect } from "react";
import { pb } from "@/integrations/pocketbase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";

export default function NotificationsSection() {
  const { t } = useTranslation(["settings", "common"]);
  const { user } = useAuth();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [sharedProjects, setSharedProjects] = useState(true);
  const [systemMessages, setSystemMessages] = useState(true);

  useEffect(() => {
    const prefs = user?.notification_prefs as Record<string, boolean> | null;
    if (prefs) {
      setEmailNotifications(prefs.emailNotifications !== false);
      setProjectUpdates(prefs.projectUpdates !== false);
      setSharedProjects(prefs.sharedProjects !== false);
      setSystemMessages(prefs.systemMessages !== false);
    }
  }, [user]);

  const saveNotificationSettings = async () => {
    if (!user?.id) return;
    try {
      await pb.collection("users").update(user.id, {
        notification_prefs: {
          emailNotifications,
          projectUpdates,
          sharedProjects,
          systemMessages,
        },
      });
      toast.success(t("settings:notifications.success_saved"));
    } catch (error: any) {
      toast.error(
        t("settings:notifications.error_save", { message: error.message }),
      );
    }
  };

  return (
    <div className="space-y-6 max-w-md text-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="emailNotifications" className="text-sm font-medium">
              {t("settings:notifications.emailNotifications")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:notifications.emailNotificationsDescription")}
            </p>
          </div>
          <Switch
            id="emailNotifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="projectUpdates" className="text-sm font-medium">
              {t("settings:notifications.projectUpdates")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:notifications.projectUpdatesDescription")}
            </p>
          </div>
          <Switch
            id="projectUpdates"
            checked={projectUpdates}
            onCheckedChange={setProjectUpdates}
            disabled={!emailNotifications}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sharedProjects" className="text-sm font-medium">
              {t("settings:notifications.sharedProjects")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:notifications.sharedProjectsDescription")}
            </p>
          </div>
          <Switch
            id="sharedProjects"
            checked={sharedProjects}
            onCheckedChange={setSharedProjects}
            disabled={!emailNotifications}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="systemMessages" className="text-sm font-medium">
              {t("settings:notifications.systemMessages")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:notifications.systemMessagesDescription")}
            </p>
          </div>
          <Switch
            id="systemMessages"
            checked={systemMessages}
            onCheckedChange={setSystemMessages}
            disabled={!emailNotifications}
          />
        </div>
      </div>

      <Button onClick={saveNotificationSettings} className="text-sm">
        {t("settings:notifications.saveButton")}
      </Button>
    </div>
  );
}
