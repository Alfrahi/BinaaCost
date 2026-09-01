import localforage from "localforage";
import { executePbMutation } from "@/lib/pb-executor";
import { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";
import { maskSensitiveData } from "@/utils/data-security";

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
  payload: string;
  queryKey: QueryKey;
  userId: string;
  retries: number;
  createdAt: string;
  lastAttemptedAt?: string;
  error?: string;
  onConflict?: string;
}

const MUTATION_QUEUE_KEY = "offline_mutation_queue";
const DEAD_LETTER_QUEUE_KEY = "offline_dead_letter_queue";
const MAX_RETRIES = 3;

class OfflineManager {
  private static instance: OfflineManager;
  private queue: OfflineMutation[] = [];
  private deadLetterQueue: OfflineMutation[] = [];
  private isSyncing = false;
  private listeners = new Set<() => void>();
  private queryClient: QueryClient | null = null;
  private _isOnline = true;

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

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public async init() {
    try {
      const storedQueue =
        await localforage.getItem<OfflineMutation[]>(MUTATION_QUEUE_KEY);
      if (storedQueue) {
        this.queue = storedQueue;
      }
      const storedDeadLetterQueue = await localforage.getItem<
        OfflineMutation[]
      >(DEAD_LETTER_QUEUE_KEY);
      if (storedDeadLetterQueue) {
        this.deadLetterQueue = storedDeadLetterQueue;
      }
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

  private async saveQueues() {
    await localforage.setItem(MUTATION_QUEUE_KEY, this.queue);
    await localforage.setItem(DEAD_LETTER_QUEUE_KEY, this.deadLetterQueue);
    this.notifyListeners();
  }

  public async addMutation(
    mutation: Omit<
      OfflineMutation,
      "id" | "retries" | "createdAt" | "payload"
    > & { payload: any; onConflict?: string },
  ) {
    const maskedPayload = maskSensitiveData(mutation.table, mutation.payload);

    const stringifiedPayload = JSON.stringify(maskedPayload);
    const encodedPayload = btoa(stringifiedPayload);

    const newMutation: OfflineMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      retries: 0,
      createdAt: new Date().toISOString(),
      payload: encodedPayload,
      onConflict: mutation.onConflict,
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

    this.isSyncing = true;
    this.notifyListeners();
    console.log("Starting to process offline queue...");

    let successfulMutations = 0;
    const failedAttempts: OfflineMutation[] = [];
    const currentQueue = [...this.queue];

    for (const mutation of currentQueue) {
      let actualPayload: any;
      try {
        const decodedString = atob(mutation.payload);
        actualPayload = JSON.parse(decodedString);
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
