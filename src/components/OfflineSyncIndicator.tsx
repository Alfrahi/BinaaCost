import { useState, useEffect } from "react";
import { offlineManager } from "@/lib/offline";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function OfflineSyncIndicator() {
  const { t } = useTranslation("common");
  const isOnline = useOnlineStatus();

  const [queueCount, setQueueCount] = useState(offlineManager.getQueueSize());
  const [isSyncing, setIsSyncing] = useState(offlineManager.getIsSyncing());

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe(() => {
      setQueueCount(offlineManager.getQueueSize());
      setIsSyncing(offlineManager.getIsSyncing());
    });
    return () => unsubscribe();
  }, []);

  if (queueCount === 0 && isOnline) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {!isOnline && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-medium">
                <CloudOff className="w-3 h-3" />
                <span>{t("offlineLabel")}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-sm">
              <p>{t("offlineTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {queueCount > 0 && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            isOnline
              ? "bg-accent text-accent-foreground border border-border"
              : "bg-muted text-muted-foreground border border-border",
          )}
        >
          <span className="flex items-center gap-1.5">
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <div className="relative">
                <RefreshCw className="w-3 h-3" />
                <span className="absolute -top-1 -end-1 w-2 h-2 bg-danger rounded-full animate-pulse" />
              </div>
            )}
            {t("changesPending", { count: queueCount })}
          </span>

          {isOnline && (
            <>
              <div className="w-px h-3 bg-border mx-1" />
              <button
                onClick={offlineManager.syncNow}
                disabled={isSyncing}
                className="hover:underline font-semibold text-xs disabled:opacity-50"
              >
                {isSyncing ? t("syncing") : t("syncNow")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
