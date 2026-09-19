import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { offlineManager, OfflineSyncEvent } from "@/shared/lib/offline";

/**
 * Subscribes to OfflineManager sync events and shows the appropriate
 * toast notifications. Mount this hook once in a top-level component
 * (e.g. AppInitializer or a layout component) so notifications fire
 * globally without coupling the OfflineManager class to sonner/i18n.
 */
export function useOfflineSyncNotifications() {
  const { t } = useTranslation("common");

  useEffect(() => {
    const unsubscribe = offlineManager.onSyncEvent((event: OfflineSyncEvent) => {
      switch (event.type) {
        case "sync_success":
          toast.success(t("offlineSyncSuccess", { count: event.count }));
          break;
        case "sync_partial_failure":
          toast.error(t("offlineSyncPartialFailure", { count: event.failedCount }));
          break;
        case "mutation_failed":
          toast.error(t("offlineMutationFailed"));
          break;
        case "mutation_retrying":
          toast.warning(t("offlineMutationRetrying"));
          break;
        case "cannot_sync_offline":
          toast.info(t("offlineCannotSync"));
          break;
        case "no_pending_changes":
          toast.info(t("noPendingChanges"));
          break;
      }
    });

    return unsubscribe;
  }, [t]);
}
