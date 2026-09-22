import { RecordModel } from "pocketbase";

// Maps a PocketBase record to the shape app types expect (legacy-style):
// `created`/`updated` become `created_at`/`updated_at`; everything else,
// including the 15-char string `id`, passes through unchanged.
export function mapRecord<T = Record<string, unknown>>(
  record: RecordModel,
): T & { id: string; version?: number } {
  const { created, updated, version, collectionId, collectionName, expand, ...rest } =
    record as RecordModel & Record<string, unknown>;

  return {
    ...rest,
    ...(expand ? { expand } : {}),
    version,
    created_at: created,
    updated_at: updated,
  } as unknown as T & { id: string; version?: number };
}

export function mapRecords<T = Record<string, unknown>>(
  records: RecordModel[],
): Array<T & { id: string }> {
  return records.map((r) => mapRecord<T>(r));
}
