import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FinancialSettings,
  hasConfirmedFinancialSettings,
} from "@/logic/financials";
import { cn } from "@/lib/utils";

interface StripProps {
  settings?: Partial<FinancialSettings> | null;
  className?: string;
}

export function FinancialAssumptionsStrip({ settings, className }: StripProps) {
  const { t } = useTranslation(["project_detail"]);

  const items: { label: string; value?: number }[] = [
    {
      label: t("project_detail:profit_pricing.overhead"),
      value: settings?.overhead_percent,
    },
    {
      label: t("project_detail:profit_pricing.generalContingency"),
      value: settings?.contingency_percent,
    },
    {
      label: t("project_detail:profit_pricing.markup"),
      value: settings?.markup_percent,
    },
    {
      label: t("project_detail:profit_pricing.taxes"),
      value: settings?.tax_percent,
    },
  ];

  return (
    <div
      data-testid="financial-assumptions"
      className={cn("flex flex-wrap items-center gap-2 text-xs", className)}
    >
      <span className="font-medium text-text-secondary">
        {t("project_detail:profit_pricing.assumptions")}:
      </span>
      {items.map((item) => (
        <span
          key={item.label}
          className="rounded-full bg-muted px-2 py-1 tabular-nums text-text-secondary"
        >
          {item.label} {item.value ?? 0}%
        </span>
      ))}
    </div>
  );
}

interface WarningProps {
  project: { financial_settings_confirmed?: boolean | null };
}

export function DefaultAssumptionsWarning({ project }: WarningProps) {
  const { t } = useTranslation(["project_detail", "common"]);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || hasConfirmedFinancialSettings(project)) {
    return null;
  }

  return (
    <Alert
      data-testid="default-assumptions-warning"
      className="border-danger/50 bg-danger/10 text-start"
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="flex items-center justify-between gap-2 text-sm">
        <span>
          {t("project_detail:profit_pricing.defaultAssumptionsWarning")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label={t("common:dismiss")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
