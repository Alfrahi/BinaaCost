import { pb } from "@/integrations/pocketbase/client";
import { callRoute } from "@/integrations/pocketbase/routes";
import { CrudOperation } from "@/lib/pb-utils";

// Executes a queued or live mutation against PocketBase.
// Mirrors the old Supabase executor switch:
//   create/update/delete per record, BULK_* as sequential per-id calls
//   (PocketBase has no `.in([])` bulk ops), RPC via the JSVM route registry.
// onConflict/UPSERT semantics are implemented by those JSVM routes.
export async function executePbMutation<T = any>(args: {
  table: string;
  operation: CrudOperation;
  payload: any;
}): Promise<T> {
  const { table, operation, payload } = args;
  const collection = pb.collection(table);
  const recordId = payload?.id;

  switch (operation) {
    case "INSERT":
      return collection.create(payload);

    case "UPDATE":
      if (!recordId) throw new Error("Update requires ID");
      return collection.update(recordId, payload);

    case "DELETE":
      if (!recordId) throw new Error("Delete requires ID");
      await collection.delete(recordId);
      return null as T;

    case "BULK_DELETE": {
      const ids = payload as unknown as string[];
      for (const id of ids) {
        await collection.delete(id);
      }
      return null as T;
    }

    case "BULK_UPDATE": {
      const { ids, data } = payload as { ids: string[]; data: any };
      const updated: unknown[] = [];
      for (const id of ids) {
        updated.push(await collection.update(id, data));
      }
      return updated as T;
    }

    case "UPSERT":
      // Conflict resolution lives in JSVM upsert routes (library sync,
      // CSV import); table+payload are passed through as-is.
      return callRoute<T>(`upsert/${table}`, payload);

    case "RPC":
      return callRoute<T>(table, payload);

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
