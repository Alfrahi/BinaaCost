import PocketBase from "pocketbase";

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL;

if (!POCKETBASE_URL) {
  throw new Error("VITE_POCKETBASE_URL is not defined in environment variables.");
}

export const pb = new PocketBase(POCKETBASE_URL);

// Eagerly kill stale sessions: PB stores auth tokens in localStorage but
// they survive user deletion, causing every rule-filtered call to bomb with
// 400 once the user record is gone. Drop the stored token on the first
// auth-kernel error (401/404 from a rule-bound request).
pb.afterSend = (response, data) => {
  if (response.status === 401 || response.status === 404) {
    if (pb.authStore.isValid && !pb.authStore.isAdmin && !pb.authStore.isSuperuser) {
      pb.authStore.clear();
    }
  }
  return data;
};
