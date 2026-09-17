import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/features/settings/hooks/useProfile";
import { useEffect } from "react";

export default function ReportOptionsSection() {
  const { t } = useTranslation(["settings", "common"]);
  const { profile, updateProfile } = useProfile();

  const [companyName, setCompanyName] = useState(profile?.company_name || "");
  const [website, setWebsite] = useState(profile?.company_website || "");

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || "");
      setWebsite(profile.company_website || "");
    }
  }, [profile]);

  const saveMetadata = async () => {
    if (!profile?.id) {
      toast.error(
        t("common:error") + ": " + t("settings:profile.profileNotFound"),
      );
      return;
    }

    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        company_name: companyName,
        company_website: website,
      });

      toast.success(t("settings:reportOptions.success_saved"));
    } catch (error: any) {
      console.error("Error saving report options:", error);
      toast.error(
        t("settings:reportOptions.error_save", { message: error.message }),
      );
    }
  };

  return (
    <div className="space-y-6 max-w-md text-sm">
      <div className="space-y-4">
        <div>
          <Label htmlFor="company_name" className="text-sm">
            {t("settings:reportOptions.companyName")}
          </Label>
          <Input
            id="company_name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            aria-label={t("settings:reportOptions.companyName")}
            className="text-sm"
          />
        </div>

        <div>
          <Label htmlFor="website" className="text-sm">
            {t("settings:reportOptions.website")}
          </Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            aria-label={t("settings:reportOptions.website")}
            className="text-sm"
          />
        </div>
      </div>

      <Button
        onClick={saveMetadata}
        disabled={updateProfile.isPending}
        className="text-sm"
      >
        {updateProfile.isPending ? t("common:saving") : t("common:save")}
      </Button>
    </div>
  );
}
