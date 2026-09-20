/**
 * Standardized staleTime intervals for TanStack React Query across the application.
 */
export const STALE_TIME = {
  REALTIME: 1000 * 10, // 10s (e.g. comments, active collaboration)
  SHORT: 1000 * 30, // 30s (e.g. audit logs)
  DYNAMIC: 1000 * 60, // 1 min (e.g. project lists, admin views)
  ENTITY: 1000 * 60 * 2, // 2 min (e.g. active project data, line items)
  LISTS: 1000 * 60 * 5, // 5 min (e.g. libraries, assemblies, versions, profile)
  STATIC: 1000 * 60 * 60, // 1 hour (e.g. dropdown settings, currencies)
} as const;
