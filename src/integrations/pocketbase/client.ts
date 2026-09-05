import PocketBase from "pocketbase";

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;

if (!POCKETBASE_URL) {
  throw new Error("VITE_POCKETBASE_URL is not defined in environment variables.");
}

export const pb = new PocketBase(POCKETBASE_URL);

// Heal stale sessions precisely: PB stores auth tokens in localStorage but
// they survive user deletion, turning rule-bound queries into 400s. Only
// clear the token when the failing request itself proves the auth record is
// gone — a `users` collection request for the authenticated record — or an
// explicit 401 from an auth endpoint. Transient 404s on other resources
// (e.g. a just-deleted project) must NOT log the user out.
pb.afterSend = (response, data) => {
  if (!pb.authStore.isValid || pb.authStore.isAdmin || pb.authStore.isSuperuser) {
    return data;
  }
  const url = response.url || "";
  const isAuthEndpoint = /\/api\/collections\/users\/auth-/.test(url);
  const isOwnUserRecord =
    /\/api\/collections\/users\/records\/[^/]+$/.test(url) &&
    url.includes(pb.authStore.record?.id ?? "__none__");

  if (response.status === 401 && isAuthEndpoint) {
    pb.authStore.clear();
  } else if ((response.status === 401 || response.status === 404) && isOwnUserRecord) {
    pb.authStore.clear();
  }
  return data;
};
