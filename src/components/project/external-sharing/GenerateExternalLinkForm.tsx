import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Loader2, Link as LinkIcon, Copy, AlertTriangle } from "lucide-react";
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
      <div className="flex items-center gap-2">
        <Heading level={3} className="text-foreground">
          {t("project_detail:share.external.title")}
        </Heading>
        <Badge>{t("project_detail:share.external.clientFacing")}</Badge>
      </div>
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
        <div className="space-y-3">
          <Alert
            data-testid="shown-once-warning"
            className="border-destructive/50 bg-destructive/10 text-start"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="text-sm font-medium">
              {t("project_detail:share.external.shownOnceWarning")}
            </AlertDescription>
          </Alert>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 border border-border rounded-md bg-muted">
            <LinkIcon className="w-4 h-4 shrink-0 self-center" aria-hidden="true" />
            <span
              className="flex-1 truncate text-sm text-foreground font-mono"
              data-testid="generated-link"
            >
              {generatedLink}
            </span>
            <Button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 text-sm"
            >
              <Copy className={cn("w-4 h-4", getIconMarginClass())} aria-hidden="true" />
              {t("project_detail:share.external.copyLink")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
