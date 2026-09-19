import PocketBase from "pocketbase";

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;

if (!POCKETBASE_URL) {
  throw new Error("VITE_POCKETBASE_URL is not defined in environment variables.");
}

export const pb = new PocketBase(POCKETBASE_URL);

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
  if (!pb.authStore.isValid || pb.authStore.isAdmin || pb.authStore.isSuperuser) {
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
