import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, FileText, Users } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { useProjectCardSummary } from "@/features/projects/hooks/useProjectCardSummary";

interface ProjectCardProps {
  id: string;
  name: string;
  updatedAt?: string;
  currency: string;
  financialSettings?: Record<string, number> | null;
  isShared?: boolean;
  sharedBy?: string;
  sharedRole?: string;
  onPrefetch: (projectId: string) => void;
}

export function ProjectCard({
  id,
  name,
  updatedAt,
  currency,
  financialSettings,
  isShared = false,
  sharedBy,
  sharedRole,
  onPrefetch,
}: ProjectCardProps) {
  const { t } = useTranslation(["dashboard", "common", "roles"]);
  const { format } = useCurrencyFormatter();
  const { formatDate } = useDateFormatter();
  const { summary, isLoadingSummary } = useProjectCardSummary(
    id,
    financialSettings,
  );

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Link
        to={`/projects/${id}`}
        className="block p-3 border border-border rounded-lg hover:bg-muted transition-colors"
        onMouseEnter={() => onPrefetch(id)}
        aria-label={t(
          isShared ? "viewSharedProject" : "viewProject",
          { projectName: name },
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm truncate">{name}</div>
          {isShared && (
            <Badge variant="muted">
              <Users className="w-3 h-3" aria-hidden="true" />
              {sharedRole
                ? t(`roles:${sharedRole}_display`)
                : t("dashboard:shared")}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="text-sm tabular-nums font-medium">
            {isLoadingSummary
              ? "—"
              : format(summary?.grandTotal ?? 0, currency)}
          </div>
          {summary?.isFinalized && (
            <Badge aria-label={t("dashboard:finalized")}>
              <Lock className="w-3 h-3" aria-hidden="true" />
              {t("dashboard:finalized")}
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <FileText className="w-3 h-3" aria-hidden="true" />
          {updatedAt
            ? formatDate(updatedAt, "short")
            : t("dashboard:noDate")}
          {isShared && sharedBy && (
            <span className="ms-1">
              · {t("dashboard:sharedBy", { email: sharedBy })}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}