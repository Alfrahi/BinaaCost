import { pb } from "./client";

// Registry of custom JSVM routes (pb_hooks). Queued RPC mutations replay
// through these HTTP endpoints (replaces legacy RPCs).
// Paths are added in later phases as the corresponding pb_hooks routes land.
const ROUTE_PATHS: Record<string, string> = {
  "upsert/library_materials": "/api/upsert/library_materials",
  "upsert/library_labor": "/api/upsert/library_labor",
  "upsert/library_equipment": "/api/upsert/library_equipment",
  "import/cost_database_items": "/api/import/cost_database_items",
  "users/resolve": "/api/users/resolve",
  "users/minimal": "/api/users/minimal",
};

// Dynamic path templates — resolved per call.
function routePath(name: string, params: Record<string, string>) {
  switch (name) {
    case "projects/share-links":
      return `/api/projects/${params.id}/share-links`;
    case "projects/versions":
      return `/api/projects/${params.id}/versions`;
    case "projects/simulate":
      return `/api/projects/${params.id}/simulate`;
    case "projects/convert-currency":
      return `/api/projects/${params.id}/convert-currency`;
    case "versions/apply":
      return `/api/versions/${params.id}/apply`;
    case "admin/users/role":
      return `/api/admin/users/${params.id}/role`;
    case "admin/users/subscription":
      return `/api/admin/users/${params.id}/subscription`;
    case "admin/users/delete":
      return `/api/admin/users/${params.id}/delete`;
    case "share":
      return `/api/share/${params.token}`;
    default:
      throw new Error(`Unknown PocketBase route: ${name}`);
  }
}

export async function callRouteWithParams<T = unknown>(
  name: string,
  params: Record<string, string>,
  payload?: unknown,
): Promise<T> {
  return pb.send<T>(routePath(name, params), {
    method: "POST",
    body: payload ?? {},
  });
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
