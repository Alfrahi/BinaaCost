import localforage from "localforage";
import { executePbMutation } from "@/integrations/pocketbase/executor";
import { pb } from "@/integrations/pocketbase/client";
import { QueryClient, QueryKey } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Event system — UI layers (components, hooks) subscribe to these events
// instead of OfflineManager importing toast/i18n directly.
// ---------------------------------------------------------------------------

export type OfflineSyncEvent =
  | { type: "sync_success"; count: number }
  | { type: "sync_partial_failure"; failedCount: number }
  | { type: "mutation_failed"; mutationId: string }
  | { type: "mutation_retrying"; mutationId: string }
  | { type: "cannot_sync_offline" }
  | { type: "no_pending_changes" }
  | { type: "id_remapped"; oldId: string; newId: string; table: string };

export type OfflineSyncEventHandler = (event: OfflineSyncEvent) => void;

export interface OfflineMutation {
  id: string;
  table: string;
  type:
    | "INSERT"
    | "UPDATE"
    | "DELETE"
    | "RPC"
    | "BULK_DELETE"
    | "BULK_UPDATE"
    | "UPSERT";
  payload: unknown;
  queryKey: QueryKey;
  userId: string;
  retries: number;
  createdAt: string;
  lastAttemptedAt?: string;
  error?: string;
}

const MUTATION_QUEUE_KEY = "offline_mutation_queue";
const DEAD_LETTER_QUEUE_KEY = "offline_dead_letter_queue";
const MAX_RETRIES = 3;

const scopedKey = (base: string, userId: string) => `${base}_${userId}`;

/**
 * Recursively remaps foreign keys, record IDs, and array references in an
 * offline mutation payload using the optimistic-to-server ID mapping table.
 */
export function remapPayload(payload: unknown, idMap: Map<string, string>): unknown {
  if (idMap.size === 0 || payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === "string") {
    return idMap.get(payload) ?? payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => remapPayload(item, idMap));
  }

  if (typeof payload === "object") {
    const remapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (typeof value === "string") {
        remapped[key] = idMap.get(value) ?? value;
      } else if (Array.isArray(value)) {
        remapped[key] = value.map((item) =>
          typeof item === "string" ? idMap.get(item) ?? item : remapPayload(item, idMap),
        );
      } else if (typeof value === "object" && value !== null) {
        remapped[key] = remapPayload(value, idMap);
      } else {
        remapped[key] = value;
      }
    }
    return remapped;
  }

  return payload;
}

/**
 * Remaps any optimistic IDs present within a TanStack Query key array.
 */
export function remapQueryKey(queryKey: QueryKey, idMap: Map<string, string>): QueryKey {
  if (idMap.size === 0 || !Array.isArray(queryKey)) {
    return queryKey;
  }
  return queryKey.map((part) =>
    typeof part === "string" ? idMap.get(part) ?? part : part,
  );
}

// M1: payloads are stored as plain objects now; legacy entries were base64.
// Decode either form.
function decodePayload(payload: unknown): unknown {
  if (payload && typeof payload === "object") {
    return payload;
  }
  if (typeof payload === "string") {
    return JSON.parse(atob(payload));
  }
  throw new Error("unrecognized payload encoding");
}

// M2: detect a PocketBase unique-constraint error on client_mutation_id.
function isClientMutationIdConflict(err: unknown): boolean {
  const errObj = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : {};
  const dataObj = typeof errObj.data === "object" && errObj.data !== null ? (errObj.data as Record<string, unknown>) : {};
  const msg = String(errObj.message ?? dataObj.message ?? "");
  return (
    /client_mutation_id/i.test(msg) &&
    /unique|constraint|already exists/i.test(msg)
  );
}

/**
 * Detects whether an error is a transient network failure, disconnection, or
 * abort, indicating that the client should drop back to offline queueing rather
 * than abandoning the user's mutation.
 */
export function isNetworkOrTransientError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;

    // PocketBase ClientResponseError with status 0 or server gateway failure
    if (err.status === 0) return true;
    if (typeof err.status === "number" && [502, 503, 504].includes(err.status)) {
      return true;
    }

    if (err.isAbort === true) return true;

    if (err.name === "AbortError" || err.name === "TimeoutError") return true;

    const code = String(err.code || "");
    if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(code)) {
      return true;
    }

    const message = String(err.message || "");
    if (
      message === "Failed to fetch" ||
      message === "fetch failed" ||
      message.includes("NetworkError") ||
      message.includes("network error") ||
      message.toLowerCase().includes("failed to fetch") ||
      message.toLowerCase().includes("network request failed") ||
      message.toLowerCase().includes("timeout")
    ) {
      return true;
    }

    if (err.originalError && isNetworkOrTransientError(err.originalError)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects whether an error represents a 404 / record not found on the server.
 */
export function isRecordNotFoundError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (err.status === 404 || err.statusCode === 404) return true;
    if (typeof err.response === "object" && err.response !== null) {
      const resp = err.response as Record<string, unknown>;
      if (resp.code === 404 || resp.status === 404) return true;
    }
    const msg = String(err.message || "");
    if (/not found|missing/i.test(msg)) return true;
    if (err.originalError && isRecordNotFoundError(err.originalError)) {
      return true;
    }
  }
  return false;
}

class OfflineManager {
  private static instance: OfflineManager;
  private queue: OfflineMutation[] = [];
  private deadLetterQueue: OfflineMutation[] = [];
  private isSyncing = false;
  private listeners = new Set<() => void>();
  private syncEventHandlers = new Set<OfflineSyncEventHandler>();
  private queryClient: QueryClient | null = null;
  private _isOnline = true;
  private activeUserId: string | null = null;
  private lastSyncedAt: string | null = null;

  private constructor() {}

  public static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  // ---------------------------------------------------------------------------
  // UI event bus — register handlers to receive sync notifications without
  // coupling this class to toast/i18n
  // ---------------------------------------------------------------------------

  public onSyncEvent(handler: OfflineSyncEventHandler): () => void {
    this.syncEventHandlers.add(handler);
    return () => this.syncEventHandlers.delete(handler);
  }

  private emitSyncEvent(event: OfflineSyncEvent): void {
    this.syncEventHandlers.forEach((h) => h(event));
  }

  public setQueryClient(client: QueryClient) {
    this.queryClient = client;
  }

  public setIsOnline(status: boolean) {
    if (this._isOnline !== status) {
      this._isOnline = status;
      this.notifyListeners();
      if (status && this.queue.length > 0 && !this.isSyncing) {
        this.processQueue();
      }
    }
  }

  public getIsOnline(): boolean {
    return this._isOnline;
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getDeadLetterSize(): number {
    return this.deadLetterQueue.length;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncedAt(): string | null {
    return this.lastSyncedAt;
  }

  public getDeadLetterQueue(): OfflineMutation[] {
    return [...this.deadLetterQueue];
  }

  public async retryDeadLetter(mutationId: string): Promise<void> {
    const mutation = this.deadLetterQueue.find((m) => m.id === mutationId);
    if (!mutation) return;

    this.deadLetterQueue = this.deadLetterQueue.filter(
      (m) => m.id !== mutationId,
    );
    mutation.retries = 0;
    delete mutation.error;
    this.queue.push(mutation);
    await this.saveQueues();
    this.notifyListeners();

    if (this._isOnline && !this.isSyncing) {
      this.processQueue();
    }
  }

  public async retryAllDeadLetters(): Promise<void> {
    if (this.deadLetterQueue.length === 0) return;

    for (const m of this.deadLetterQueue) {
      m.retries = 0;
      delete m.error;
      this.queue.push(m);
    }
    this.deadLetterQueue = [];
    await this.saveQueues();
    this.notifyListeners();

    if (this._isOnline && !this.isSyncing) {
      this.processQueue();
    }
  }

  public async dismissDeadLetter(mutationId: string): Promise<void> {
    this.deadLetterQueue = this.deadLetterQueue.filter(
      (m) => m.id !== mutationId,
    );
    await this.saveQueues();
    this.notifyListeners();
  }

  public async clearDeadLetters(): Promise<void> {
    this.deadLetterQueue = [];
    await this.saveQueues();
    this.notifyListeners();
  }

  public async init(userId?: string) {
    try {
      this.activeUserId = userId ?? null;
      const queueKey = userId
        ? scopedKey(MUTATION_QUEUE_KEY, userId)
        : MUTATION_QUEUE_KEY;
      const deadKey = userId
        ? scopedKey(DEAD_LETTER_QUEUE_KEY, userId)
        : DEAD_LETTER_QUEUE_KEY;

      const storedQueue =
        await localforage.getItem<OfflineMutation[]>(queueKey);
      if (storedQueue) {
        this.queue = storedQueue;
      } else {
        this.queue = [];
      }
      const storedDeadLetterQueue = await localforage.getItem<
        OfflineMutation[]
      >(deadKey);
      if (storedDeadLetterQueue) {
        this.deadLetterQueue = storedDeadLetterQueue;
      } else {
        this.deadLetterQueue = [];
      }

      // SEC-004: Do not reassign legacy unscoped mutations to whichever user logs in.
      // Isolate legacy unscoped mutations into an archival backup key to prevent
      // cross-account execution vulnerabilities on shared browsers.
      if (userId) {
        const legacy = await localforage.getItem<OfflineMutation[]>(
          MUTATION_QUEUE_KEY,
        );
        if (legacy && legacy.length > 0) {
          console.warn(
            `[SEC-004] Detected ${legacy.length} legacy unscoped offline mutations. Isolating to 'offline_unscoped_backup' to prevent cross-account execution.`,
          );
          const backup =
            (await localforage.getItem<OfflineMutation[]>("offline_unscoped_backup")) || [];
          await localforage.setItem("offline_unscoped_backup", [
            ...backup,
            ...legacy,
          ]);
          await localforage.removeItem(MUTATION_QUEUE_KEY);
        }
      }

      this.migrateRedactedEntries();
      this.notifyListeners();
      console.log(
        "OfflineManager initialized. Queue size:",
        this.queue.length,
        "Dead Letter Queue size:",
        this.deadLetterQueue.length,
      );
    } catch (error) {
      console.error("Failed to load offline queues:", error);
    }
  }

  // H1: clear in-memory state on logout. On-disk queues are left intact so an
  // interrupted user can sync next time THEY log in.
  public reset() {
    this.queue = [];
    this.deadLetterQueue = [];
    this.activeUserId = null;
    this.isSyncing = false;
    this.notifyListeners();
  }

  // H2: entries whose payload was masked by the old redaction bug are
  // unrecoverable — move them to the dead-letter queue instead of replaying
  // "[REDACTED]" over real data.
  private migrateRedactedEntries() {
    const redacted: OfflineMutation[] = [];
    const kept: OfflineMutation[] = [];
    for (const m of this.queue) {
      let isRedacted = false;
      try {
        const decoded = decodePayload(m.payload);
        isRedacted = JSON.stringify(decoded).includes("[REDACTED]");
      } catch {
        isRedacted = false;
      }
      if (isRedacted) {
        m.error = "corrupted by redaction bug (unrecoverable)";
        m.retries = MAX_RETRIES;
        redacted.push(m);
      } else {
        kept.push(m);
      }
    }
    if (redacted.length > 0) {
      this.queue = kept;
      this.deadLetterQueue = this.deadLetterQueue.concat(redacted);
      this.saveQueues();
    }
  }

  private async saveQueues() {
    const queueKey = this.activeUserId
      ? scopedKey(MUTATION_QUEUE_KEY, this.activeUserId)
      : MUTATION_QUEUE_KEY;
    const deadKey = this.activeUserId
      ? scopedKey(DEAD_LETTER_QUEUE_KEY, this.activeUserId)
      : DEAD_LETTER_QUEUE_KEY;
    await localforage.setItem(queueKey, this.queue);
    await localforage.setItem(deadKey, this.deadLetterQueue);
    this.notifyListeners();
  }

  public async addMutation(
    mutation: Omit<
      OfflineMutation,
      "id" | "retries" | "createdAt" | "payload"
    > & { payload: unknown },
  ) {
    // M1: store the plain object (structured clone) — no base64, so Unicode
    // (e.g. Arabic) round-trips byte-identically.
    // M2: tag INSERT payloads with a client_mutation_id so a retry after a
    // lost response can't create a duplicate row.
    const mutationId = crypto.randomUUID();
    const payload =
      mutation.type === "INSERT" &&
      typeof mutation.payload === "object" &&
      mutation.payload !== null
        ? { ...(mutation.payload as Record<string, unknown>), client_mutation_id: mutationId }
        : mutation.payload;

    const newMutation: OfflineMutation = {
      ...mutation,
      id: mutationId,
      retries: 0,
      createdAt: new Date().toISOString(),
      payload,
    };
    this.queue.push(newMutation);
    await this.saveQueues();
    console.log("Mutation added to queue:", newMutation.id);
    this.processQueue();
  }

  private cascadeIdRemap(idMap: Map<string, string>, currentQueue: OfflineMutation[]) {
    if (idMap.size === 0) return;
    for (const m of this.queue) {
      try {
        const decoded = decodePayload(m.payload);
        m.payload = remapPayload(decoded, idMap);
      } catch {
        // ignore decode errors for corrupt payloads
      }
      m.queryKey = remapQueryKey(m.queryKey, idMap);
    }
    for (const m of currentQueue) {
      try {
        const decoded = decodePayload(m.payload);
        m.payload = remapPayload(decoded, idMap);
      } catch {
        // ignore
      }
      m.queryKey = remapQueryKey(m.queryKey, idMap);
    }
  }

  public async processQueue() {
    if (!this._isOnline || this.isSyncing || this.queue.length === 0) {
      return;
    }

    // H1: never replay a queue that belongs to a different account.
    const mismatched = this.queue.filter(
      (m) => this.activeUserId && m.userId !== this.activeUserId,
    );
    if (mismatched.length > 0) {
      console.warn(
        "Refusing to replay mutations for a different user; queue not owned by active account",
      );
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();
    console.log("Starting to process offline queue...");

    let successfulMutations = 0;
    const failedAttempts: OfflineMutation[] = [];
    const currentQueue = [...this.queue];
    const idMap = new Map<string, string>();

    for (const mutation of currentQueue) {
      let actualPayload: any;
      try {
        actualPayload = decodePayload(mutation.payload);
      } catch (decodeError: any) {
        console.error(
          "Failed to decode or parse payload for mutation:",
          mutation.id,
          decodeError,
        );
        mutation.retries = MAX_RETRIES;
        mutation.lastAttemptedAt = new Date().toISOString();
        mutation.error = `Payload corruption: ${decodeError.message}`;
        this.deadLetterQueue.push(mutation);
        this.queue = this.queue.filter((q) => q.id !== mutation.id);
        this.emitSyncEvent({ type: "mutation_failed", mutationId: mutation.id });
        continue;
      }

      // Remap optimistic foreign keys / record IDs in the current mutation payload
      actualPayload = remapPayload(actualPayload, idMap);
      const originalQueryKey = mutation.queryKey;
      mutation.queryKey = remapQueryKey(mutation.queryKey, idMap);

      const preExecutionId =
        actualPayload && typeof actualPayload === "object" && "id" in actualPayload
          ? String(actualPayload.id)
          : undefined;

      try {
        const result = await executePbMutation<Record<string, unknown>>({
          table: mutation.table,
          operation: mutation.type,
          payload: actualPayload,
        });

        successfulMutations++;
        console.log("Successfully synced mutation:", mutation.id);

        const serverId =
          result && typeof result === "object" && "id" in result
            ? String((result as any).id)
            : undefined;

        if (mutation.type === "INSERT" && serverId) {
          let hasNewMapping = false;
          if (preExecutionId && serverId !== preExecutionId) {
            idMap.set(preExecutionId, serverId);
            hasNewMapping = true;
            this.emitSyncEvent({
              type: "id_remapped",
              oldId: preExecutionId,
              newId: serverId,
              table: mutation.table,
            });
          }
          if (mutation.id && mutation.id !== serverId) {
            idMap.set(mutation.id, serverId);
            hasNewMapping = true;
          }
          if (
            actualPayload?.client_mutation_id &&
            String(actualPayload.client_mutation_id) !== serverId
          ) {
            idMap.set(String(actualPayload.client_mutation_id), serverId);
            hasNewMapping = true;
          }

          if (hasNewMapping) {
            this.cascadeIdRemap(idMap, currentQueue);
            await this.saveQueues();
          }

          if (this.queryClient && preExecutionId) {
            const oldProject = this.queryClient.getQueryData(["project", preExecutionId]);
            if (oldProject) {
              this.queryClient.setQueryData(["project", serverId], {
                ...(typeof oldProject === "object" ? oldProject : {}),
                id: serverId,
              });
            }
          }
        }

        if (this.queryClient) {
          await this.queryClient.invalidateQueries({
            queryKey: mutation.queryKey,
          });
          if (
            originalQueryKey &&
            JSON.stringify(originalQueryKey) !== JSON.stringify(mutation.queryKey)
          ) {
            await this.queryClient.invalidateQueries({
              queryKey: originalQueryKey,
            });
          }
          if (
            mutation.table === "projects" ||
            mutation.table === "materials" ||
            mutation.table === "labor_items" ||
            mutation.table === "equipment_items" ||
            mutation.table === "additional_costs"
          ) {
            await this.queryClient.invalidateQueries({
              queryKey: ["analytics_projects_data"],
            });
          }
        }

        this.queue = this.queue.filter((q) => q.id !== mutation.id);
      } catch (err: any) {
        // M2: a unique-constraint violation on client_mutation_id means the
        // server already committed this INSERT (response was lost) — treat as
        // success and drain, don't dead-letter.
        if (isClientMutationIdConflict(err)) {
          console.log(
            "Mutation already committed (client_mutation_id conflict):",
            mutation.id,
          );
          if (preExecutionId && actualPayload?.client_mutation_id) {
            try {
              const existing = await pb
                .collection(mutation.table)
                .getFirstListItem(`client_mutation_id="${actualPayload.client_mutation_id}"`);
              if (existing?.id) {
                idMap.set(preExecutionId, existing.id);
                this.cascadeIdRemap(idMap, currentQueue);
                await this.saveQueues();
              }
            } catch {
              // Ignore lookup error if record cannot be fetched
            }
          }
          successfulMutations++;
          this.queue = this.queue.filter((q) => q.id !== mutation.id);
          if (this.queryClient) {
            await this.queryClient.invalidateQueries({
              queryKey: mutation.queryKey,
            });
            if (
              originalQueryKey &&
              JSON.stringify(originalQueryKey) !== JSON.stringify(mutation.queryKey)
            ) {
              await this.queryClient.invalidateQueries({
                queryKey: originalQueryKey,
              });
            }
          }
          continue;
        }

        // OFFL-05: If a DELETE operation fails with 404 / Not Found,
        // the record was already deleted on the server. Treat as successful.
        if (mutation.type === "DELETE" && isRecordNotFoundError(err)) {
          console.log(
            "Record already deleted on server (404 on DELETE):",
            mutation.id,
          );
          successfulMutations++;
          this.queue = this.queue.filter((q) => q.id !== mutation.id);
          if (this.queryClient) {
            await this.queryClient.invalidateQueries({
              queryKey: mutation.queryKey,
            });
            if (
              originalQueryKey &&
              JSON.stringify(originalQueryKey) !== JSON.stringify(mutation.queryKey)
            ) {
              await this.queryClient.invalidateQueries({
                queryKey: originalQueryKey,
              });
            }
          }
          continue;
        }

        if (mutation.type === "BULK_DELETE" && isRecordNotFoundError(err)) {
          const urlStr = typeof err === "object" && err !== null ? String((err as any).url || "") : "";
          const failedId = urlStr.split("/").filter(Boolean).pop();
          if (failedId && Array.isArray(actualPayload)) {
            const remaining = actualPayload.filter((id) => id !== failedId);
            if (remaining.length < actualPayload.length) {
              if (remaining.length === 0) {
                console.log("All items in BULK_DELETE already deleted (404):", mutation.id);
                successfulMutations++;
                this.queue = this.queue.filter((q) => q.id !== mutation.id);
                if (this.queryClient) {
                  await this.queryClient.invalidateQueries({ queryKey: mutation.queryKey });
                }
                continue;
              }
              console.log(`Partial 404 on BULK_DELETE, removed ${failedId}, retrying remainder:`, mutation.id);
              mutation.payload = remaining;
              mutation.retries = Math.max(0, mutation.retries - 1);
              failedAttempts.push(mutation);
              this.emitSyncEvent({ type: "mutation_retrying", mutationId: mutation.id });
              
              const remainingIndex = currentQueue.indexOf(mutation) + 1;
              for (let r = remainingIndex; r < currentQueue.length; r++) {
                failedAttempts.push(currentQueue[r]);
              }
              break;
            }
          }
        }

        // OFFL-04: If this was a network disconnection / transient error during replay,
        // mark offline and abort this drain cycle WITHOUT burning retries toward dead-letter.
        if (isNetworkOrTransientError(err)) {
          console.warn("Network interrupted during queue replay:", mutation.id, err);
          this._isOnline = false;
          this.notifyListeners();
          failedAttempts.push(mutation);
          const remainingIndex = currentQueue.indexOf(mutation) + 1;
          for (let r = remainingIndex; r < currentQueue.length; r++) {
            failedAttempts.push(currentQueue[r]);
          }
          this.emitSyncEvent({ type: "cannot_sync_offline" });
          break;
        }

        console.error("Failed to sync offline mutation:", mutation.id, err);
        mutation.retries++;
        mutation.lastAttemptedAt = new Date().toISOString();
        mutation.error = err.message;

        if (mutation.retries >= MAX_RETRIES) {
          this.deadLetterQueue.push(mutation);
          this.queue = this.queue.filter((q) => q.id !== mutation.id);
          this.emitSyncEvent({ type: "mutation_failed", mutationId: mutation.id });
          console.warn("Mutation moved to dead letter queue:", mutation.id);
        } else {
          failedAttempts.push(mutation);
          this.emitSyncEvent({ type: "mutation_retrying", mutationId: mutation.id });
          
          const remainingIndex = currentQueue.indexOf(mutation) + 1;
          for (let r = remainingIndex; r < currentQueue.length; r++) {
            failedAttempts.push(currentQueue[r]);
          }
          break;
        }
      }
    }

    this.queue = [
      ...failedAttempts,
      ...this.queue.filter((q) => !currentQueue.some((cq) => cq.id === q.id))
    ];

    if (successfulMutations > 0) {
      this.lastSyncedAt = new Date().toISOString();
    }

    await this.saveQueues();

    if (successfulMutations > 0) {
      this.emitSyncEvent({ type: "sync_success", count: successfulMutations });
    }
    if (failedAttempts.length > 0) {
      const actualFailures = failedAttempts.filter(m => m.error).length || 1;
      this.emitSyncEvent({ type: "sync_partial_failure", failedCount: actualFailures });
    }

    this.isSyncing = false;
    this.notifyListeners();

    if (this.queue.length > 0 && this._isOnline) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  public syncNow = () => {
    if (!this._isOnline) {
      this.emitSyncEvent({ type: "cannot_sync_offline" });
      return;
    }
    if (this.queue.length === 0) {
      this.emitSyncEvent({ type: "no_pending_changes" });
      return;
    }
    this.processQueue();
  };
}

export const offlineManager = OfflineManager.getInstance();
