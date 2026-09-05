import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link as LinkIcon, Copy } from "lucide-react";
import { cn, getIconMarginClass } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

interface GenerateExternalLinkFormProps {
  isGenerating: boolean;
  onGenerate: (expiresAt: string, password?: string) => Promise<string | null>;
}

export function GenerateExternalLinkForm({
  isGenerating,
  onGenerate,
}: GenerateExternalLinkFormProps) {
  const { t } = useTranslation(["project_detail", "common"]);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd"),
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error(t("project_detail:share.external.passwordRequired"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("project_detail:share.external.passwordTooShort"));
      return;
    }
    if (!expiresAt) {
      toast.error(t("project_detail:share.external.expirationRequired"));
      return;
    }
    const expiryDate = new Date(expiresAt);
    if (Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
      toast.error(t("project_detail:share.external.expirationRequired"));
      return;
    }
    const token = await onGenerate(expiryDate.toISOString(), password);
    if (token) {
      const baseUrl = window.location.origin;
      setGeneratedLink(`${baseUrl}/public-share/${token}`);
      setPassword("");
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success(t("project_detail:share.external.linkCopied"));
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <h3 className="font-semibold text-lg text-text-primary">
        {t("project_detail:share.external.title")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t("project_detail:share.external.description")}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="external-password" className="text-sm">
              {t("project_detail:share.external.password")}
            </Label>
            <Input
              id="external-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                "project_detail:share.external.passwordPlaceholder",
              )}
              className="text-sm"
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="external-expires-at" className="text-sm">
              {t("project_detail:share.external.expiresAt")}
            </Label>
            <Input
              id="external-expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
              className="text-sm"
              disabled={isGenerating}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={isGenerating || !password.trim() || !expiresAt}
          className="text-sm"
        >
          {isGenerating ? (
            <>
              <Loader2
                className={cn("w-4 h-4", getIconMarginClass(), "animate-spin")}
              />
              {t("project_detail:share.external.generating")}
            </>
          ) : (
            <>
              <LinkIcon className={cn("w-4 h-4", getIconMarginClass())} />
              {t("project_detail:share.external.generateLink")}
            </>
          )}
        </Button>
      </form>

      {generatedLink && (
        <div className="flex items-center gap-2 p-3 border border-border rounded-md bg-muted text-text-primary text-sm">
          <LinkIcon className="w-4 h-4" />
          <span className="flex-1 truncate">{generatedLink}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-primary hover:bg-muted"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
