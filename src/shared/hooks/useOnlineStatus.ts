import { useState, useEffect, useCallback, useRef } from "react";

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * Online status that reflects BOTH the browser's network interface and the
 * PocketBase server's reachability. `navigator.onLine` alone reports "online"
 * even when the server is down (or auth is broken), which made syncs fail
 * silently while the UI showed "online". A periodic `/api/health` probe closes
 * that gap.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [serverReachable, setServerReachable] = useState(true);
  const mountedRef = useRef(true);

  const probeServer = useCallback(async () => {
    if (!POCKETBASE_URL) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${POCKETBASE_URL}/api/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);
      if (mountedRef.current) {
        setServerReachable(res.ok);
      }
    } catch {
      if (mountedRef.current) {
        setServerReachable(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    function handleOnline() {
      setIsOnline(true);
      probeServer();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Probe immediately and then on an interval so a dead server is detected
    // even when the browser's network interface stays "online".
    probeServer();
    const interval = setInterval(probeServer, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [probeServer]);

  return isOnline && serverReachable;
}