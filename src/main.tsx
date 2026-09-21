import { Suspense, useRef, useEffect } from "react";
import App from "./App.tsx";
import "./globals.css";
import "./i18n";
import PageLoader from "@/shared/components/PageLoader";
import { ErrorBoundary } from "react-error-boundary";
import ErrorDisplay from "@/shared/components/ErrorDisplay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { offlineManager } from "@/shared/lib/offline";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { useOfflineSyncNotifications } from "@/shared/hooks/useOfflineSyncNotifications";
import { createRoot } from "react-dom/client";
import { STALE_TIME } from "@/shared/lib/queryDefaults";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.DYNAMIC,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
});

function AppInitializer() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    offlineManager.setIsOnline(isOnline);
  }, [isOnline]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      offlineManager.setQueryClient(queryClient);
      initializedRef.current = true;
    }
  }, []);

  // Wire sync event notifications (toast/i18n) here so OfflineManager
  // stays decoupled from UI concerns and can be unit-tested in isolation.
  useOfflineSyncNotifications();

  return <App />;
}

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <ErrorDisplay error={error} onRetry={resetErrorBoundary} fullPage={true} />
  );
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<PageLoader />}>
      <QueryClientProvider client={queryClient}>
        <AppInitializer />
      </QueryClientProvider>
    </Suspense>
  </ErrorBoundary>,
);
