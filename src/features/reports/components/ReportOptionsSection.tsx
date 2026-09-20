import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useReportSettings } from "@/features/settings/hooks/useReportSettings";

export default function ReportOptionsSection() {
  const { t } = useTranslation(["settings", "common"]);
  const { reportSettings, updateReportSettings, isLoading } = useReportSettings();

  const [companyName, setCompanyName] = useState(reportSettings.company_name || "");
  const [website, setWebsite] = useState(reportSettings.company_website || "");
  const [email, setEmail] = useState(reportSettings.company_email || "");
  const [phone, setPhone] = useState(reportSettings.company_phone || "");
  const [address, setAddress] = useState(reportSettings.company_address || "");
  const [logoUrl, setLogoUrl] = useState(reportSettings.company_logo_url || "");
  const [defaultTerms, setDefaultTerms] = useState(reportSettings.default_terms || "");

  useEffect(() => {
    if (reportSettings) {
      setCompanyName(reportSettings.company_name || "");
      setWebsite(reportSettings.company_website || "");
      setEmail(reportSettings.company_email || "");
      setPhone(reportSettings.company_phone || "");
      setAddress(reportSettings.company_address || "");
      setLogoUrl(reportSettings.company_logo_url || "");
      setDefaultTerms(reportSettings.default_terms || "");
    }
  }, [reportSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateReportSettings.mutate({
      company_name: companyName,
      company_website: website,
      company_email: email,
      company_phone: phone,
      company_address: address,
      company_logo_url: logoUrl,
      default_terms: defaultTerms,
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="company_name" className="text-sm">
            {t("settings:reportOptions.companyName")}
          </Label>
          <Input
            id="company_name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={t("settings:reportOptions.companyNamePlaceholder")}
            aria-label={t("settings:reportOptions.companyName")}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website" className="text-sm">
            {t("settings:reportOptions.website")}
          </Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t("settings:reportOptions.websitePlaceholder")}
            aria-label={t("settings:reportOptions.website")}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company_email" className="text-sm">
            {t("settings:reportOptions.email")}
          </Label>
          <Input
            id="company_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("settings:reportOptions.emailPlaceholder")}
            aria-label={t("settings:reportOptions.email")}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company_phone" className="text-sm">
            {t("settings:reportOptions.phone")}
          </Label>
          <Input
            id="company_phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("settings:reportOptions.phonePlaceholder")}
            aria-label={t("settings:reportOptions.phone")}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="company_address" className="text-sm">
            {t("settings:reportOptions.address")}
          </Label>
          <Input
            id="company_address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("settings:reportOptions.addressPlaceholder")}
            aria-label={t("settings:reportOptions.address")}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="logo_url" className="text-sm">
            {t("settings:reportOptions.logoUrl")}
          </Label>
          <Input
            id="logo_url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder={t("settings:reportOptions.logoUrlPlaceholder")}
            aria-label={t("settings:reportOptions.logoUrl")}
            className="text-sm"
          />
          {logoUrl && (
            <div className="mt-2 p-2 border rounded-md bg-muted/30 inline-block">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="default_terms" className="text-sm">
            {t("settings:reportOptions.defaultTerms")}
          </Label>
          <Textarea
            id="default_terms"
            rows={4}
            value={defaultTerms}
            onChange={(e) => setDefaultTerms(e.target.value)}
            placeholder={t("settings:reportOptions.defaultTermsPlaceholder")}
            aria-label={t("settings:reportOptions.defaultTerms")}
            className="text-sm"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={updateReportSettings.isPending || isLoading}
        className="text-sm"
      >
        {updateReportSettings.isPending ? t("common:saving") : t("common:save")}
      </Button>
    </form>
  );
}
