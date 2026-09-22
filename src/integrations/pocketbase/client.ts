import PocketBase, { BaseAuthStore } from "pocketbase";

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;

if (!POCKETBASE_URL) {
  throw new Error("VITE_POCKETBASE_URL is not defined in environment variables.");
}

// A custom AuthStore that saves the user record to localStorage
// but prevents the actual JWT token from being stored in the browser,
// mitigating XSS token exfiltration. The real token lives in an HttpOnly cookie.
class CookieAuthStore extends BaseAuthStore {
  constructor() {
    super();
    try {
      const raw = localStorage.getItem("pb_auth_record");
      if (raw) {
        const data = JSON.parse(raw);
        // Load with a dummy token so the SDK considers it valid
        this.save("dummy_token", data.record);
      }
    } catch (e) {
      console.warn("Failed to parse pb_auth_record", e);
    }
  }

  save(token: string, record: any) {
    // Keep the in-memory state updated
    super.save(token, record);
    // Only persist the record, never the real token
    localStorage.setItem(
      "pb_auth_record",
      JSON.stringify({ record })
    );
  }

  clear() {
    super.clear();
    localStorage.removeItem("pb_auth_record");
    localStorage.removeItem("pocketbase_auth"); // Cleanup old default store
    // Ask the backend to clear the HttpOnly cookie
    fetch(`${POCKETBASE_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(console.error);
  }
}

export const pb = new PocketBase(POCKETBASE_URL, new CookieAuthStore());

// Ensure the browser sends the HttpOnly cookie with every request
pb.beforeSend = (url, options) => {
  options.credentials = "include";
  // The SDK automatically attaches the dummy token as a Bearer header.
  // The backend middleware will ignore this dummy token and read the HttpOnly cookie instead.
  return { url, options };
};
// The SDK's default auto-cancellation keys requests by method+path only, so
// parallel queries against the same collection (e.g. the six concurrent
// dropdown_settings reads on the costs tab) cancel each other and the
// dropdowns never populate. React Query already handles request lifecycle.
pb.autoCancellation(false);

// Heal stale sessions precisely: PB stores auth tokens in localStorage but
// they survive user deletion or token expiry, turning rule-bound queries into
// 401s or trapping users in unresponsive zombie sessions.
// Clear the authStore whenever a 401 Unauthorized is returned for an active session,
// or when a request for the authenticated user's own record returns 404 (user deleted).
// Transient 404s on other resources (e.g. a just-deleted project) must NOT log the user out.
pb.afterSend = (response, data) => {
  if (!pb.authStore.isValid || pb.authStore.isSuperuser) {
    return data;
  }
  const url = response.url || "";
  const isOwnUserRecord =
    /\/api\/collections\/users\/records\/[^/]+$/.test(url) &&
    url.includes(pb.authStore.record?.id ?? "__none__");

  if (response.status === 401) {
    pb.authStore.clear();
  } else if (response.status === 404 && isOwnUserRecord) {
    pb.authStore.clear();
  }
  return data;
};
