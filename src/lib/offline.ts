import localforage from "localforage";
import { executePbMutation } from "@/lib/pb-executor";
import { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";

interface OfflineMutation {
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
  payload: any;
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

// M1: payloads are stored as plain objects now; legacy entries were base64.
// Decode either form.
function decodePayload(payload: any): any {
  if (payload && typeof payload === "object") {
    return payload;
  }
  if (typeof payload === "string") {
    return JSON.parse(atob(payload));
  }
  throw new Error("unrecognized payload encoding");
}

// M2: detect a PocketBase unique-constraint error on client_mutation_id.
function isClientMutationIdConflict(err: any): boolean {
  const msg = String(err?.message ?? err?.data?.message ?? "");
  return (
    /client_mutation_id/i.test(msg) &&
    /unique|constraint|already exists/i.test(msg)
  );
}

class OfflineManager {
  private static instance: OfflineManager;
  private queue: OfflineMutation[] = [];
  private deadLetterQueue: OfflineMutation[] = [];
  private isSyncing = false;
  private listeners = new Set<() => void>();
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

      // H1: migrate a legacy unscoped queue into the current user's namespace.
      if (userId) {
        const legacy = await localforage.getItem<OfflineMutation[]>(
          MUTATION_QUEUE_KEY,
        );
        if (legacy && legacy.length > 0) {
          // Update userId for all legacy mutations to current user
          const migratedLegacy = legacy.map(mutation => ({
            ...mutation,
            userId: userId
          }));
          this.queue = this.queue.concat(migratedLegacy);
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
    > & { payload: any },
  ) {
    // M1: store the plain object (structured clone) — no base64, so Unicode
    // (e.g. Arabic) round-trips byte-identically.
    // M2: tag INSERT payloads with a client_mutation_id so a retry after a
    // lost response can't create a duplicate row.
    const mutationId = crypto.randomUUID();
    const payload =
      mutation.type === "INSERT"
        ? { ...mutation.payload, client_mutation_id: mutationId }
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
        toast.error(i18n.t("common:offlineMutationFailed"));
        continue;
      }

      try {
        await executePbMutation({
          table: mutation.table,
          operation: mutation.type,
          payload: actualPayload,
        });

        successfulMutations++;
        console.log("Successfully synced mutation:", mutation.id);

        if (this.queryClient) {
          await this.queryClient.invalidateQueries({
            queryKey: mutation.queryKey,
          });
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
          successfulMutations++;
          this.queue = this.queue.filter((q) => q.id !== mutation.id);
          if (this.queryClient) {
            await this.queryClient.invalidateQueries({
              queryKey: mutation.queryKey,
            });
          }
          continue;
        }

        console.error("Failed to sync offline mutation:", mutation.id, err);
        mutation.retries++;
        mutation.lastAttemptedAt = new Date().toISOString();
        mutation.error = err.message;

        if (mutation.retries >= MAX_RETRIES) {
          this.deadLetterQueue.push(mutation);
          this.queue = this.queue.filter((q) => q.id !== mutation.id);
          toast.error(i18n.t("common:offlineMutationFailed"));
          console.warn("Mutation moved to dead letter queue:", mutation.id);
        } else {
          failedAttempts.push(mutation);
          toast.warning(i18n.t("common:offlineMutationRetrying"));
        }
      }
    }

    this.queue = this.queue
      .filter((q) => !currentQueue.some((cq) => cq.id === q.id))
      .concat(failedAttempts);

    if (successfulMutations > 0) {
      this.lastSyncedAt = new Date().toISOString();
    }

    await this.saveQueues();

    if (successfulMutations > 0) {
      toast.success(
        i18n.t("common:offlineSyncSuccess", { count: successfulMutations }),
      );
    }
    if (failedAttempts.length > 0) {
      toast.error(
        i18n.t("common:offlineSyncPartialFailure", {
          count: failedAttempts.length,
        }),
      );
    }

    this.isSyncing = false;
    this.notifyListeners();

    if (this.queue.length > 0 && this._isOnline) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  public syncNow = () => {
    if (!this._isOnline) {
      toast.info(i18n.t("common:offlineCannotSync"));
      return;
    }
    if (this.queue.length === 0) {
      toast.info(i18n.t("common:noPendingChanges"));
      return;
    }
    this.processQueue();
  };
}

export const offlineManager = OfflineManager.getInstance();
