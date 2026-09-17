import { Suspense, useRef, useEffect } from "react";
import App from "./App.tsx";
import "./globals.css";
import "./i18n";
import PageLoader from "./shared/components/PageLoader";
import { ErrorBoundary } from "react-error-boundary";
import ErrorDisplay from "./shared/components/ErrorDisplay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { offlineManager } from "./shared/lib/offline";
import { useOnlineStatus } from "./shared/hooks/useOnlineStatus";
import { createRoot } from "react-dom/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
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
      // NOTE: do NOT call offlineManager.init() here — it runs with no user
      // id on boot and would reset the account scoping set by AuthProvider
      // (effects run child-first), silently un-scoping the mutation queue.
      initializedRef.current = true;
    }
  }, []);

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
