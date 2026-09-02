import { pb } from "./client";

// Registry of custom JSVM routes (pb_hooks). Queued RPC mutations replay
// through these HTTP endpoints instead of Supabase RPCs.
// Paths are added in later phases as the corresponding pb_hooks routes land.
const ROUTE_PATHS: Record<string, string> = {
  "upsert/library_materials": "/api/upsert/library_materials",
  "upsert/library_labor": "/api/upsert/library_labor",
  "upsert/library_equipment": "/api/upsert/library_equipment",
};

export function hasRoute(name: string): boolean {
  return name in ROUTE_PATHS;
}

export async function callRoute<T = unknown>(
  name: string,
  payload?: unknown,
): Promise<T> {
  const path = ROUTE_PATHS[name];
  if (!path) {
    throw new Error(`Unknown PocketBase route: ${name}`);
  }
  return pb.send<T>(path, { method: "POST", body: payload ?? {} });
}
