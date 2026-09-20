import { useState, useEffect } from "react";
import { offlineManager, OfflineMutation } from "@/shared/lib/offline";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { DeadLetterDrawer } from "./DeadLetterDrawer";

export default function OfflineSyncIndicator() {
  const { t } = useTranslation("common");
  const isOnline = useOnlineStatus();

  const [queueCount, setQueueCount] = useState(offlineManager.getQueueSize());
  const [deadLetterCount, setDeadLetterCount] = useState(
    offlineManager.getDeadLetterSize(),
  );
  const [deadLetterMutations, setDeadLetterMutations] = useState<
    OfflineMutation[]
  >(offlineManager.getDeadLetterQueue());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(offlineManager.getIsSyncing());
  const [lastSyncedAt, setLastSyncedAt] = useState(
    offlineManager.getLastSyncedAt(),
  );

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe(() => {
      setQueueCount(offlineManager.getQueueSize());
      setDeadLetterCount(offlineManager.getDeadLetterSize());
      setDeadLetterMutations(offlineManager.getDeadLetterQueue());
      setIsSyncing(offlineManager.getIsSyncing());
      setLastSyncedAt(offlineManager.getLastSyncedAt());
    });
    return () => unsubscribe();
  }, []);

  if (queueCount === 0 && deadLetterCount === 0 && isOnline) return null;

  return (
    <div
      className="flex items-center gap-2 text-sm"
      role="status"
      aria-live="polite"
    >
      {!isOnline && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded-sm bg-muted text-muted-foreground text-xs font-medium">
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
                <span className="absolute -top-1 -end-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
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

      {deadLetterCount > 0 && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium cursor-pointer border border-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  aria-label={t("viewFailedChanges")}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t("failedChanges", { count: deadLetterCount })}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-sm">
                <p>{t("failedChangesTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DeadLetterDrawer
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            mutations={deadLetterMutations}
          />
        </>
      )}

      {lastSyncedAt && queueCount === 0 && (
        <span className="text-xs text-muted-foreground">
          {t("lastSynced", {
            time: new Date(lastSyncedAt).toLocaleTimeString(),
          })}
        </span>
      )}
    </div>
  );
}
