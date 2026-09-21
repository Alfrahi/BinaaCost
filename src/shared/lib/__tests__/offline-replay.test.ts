import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/pocketbase/executor", () => ({
  executePbMutation: vi.fn(),
}));

// in-memory localforage
const store = new Map<string, unknown>();
vi.mock("localforage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  },
}));

import { executePbMutation } from "@/integrations/pocketbase/executor";
import {
  offlineManager,
  OfflineSyncEvent,
  remapPayload,
  remapQueryKey,
} from "@/shared/lib/offline";

const flush = async () => {
  // let addMutation/processQueue promise chains settle
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

/** Capture sync events emitted by OfflineManager during a callback. */
async function captureEvents(fn: () => Promise<void>): Promise<OfflineSyncEvent[]> {
  const captured: OfflineSyncEvent[] = [];
  const unsub = offlineManager.onSyncEvent((e) => captured.push(e));
  await fn();
  unsub();
  return captured;
}

describe("offline queue replay (PocketBase executor)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    offlineManager.reset();
    offlineManager.setIsOnline(true);
  });

  it("replays a queued INSERT through the PocketBase executor and clears the queue", async () => {
    (executePbMutation as any).mockResolvedValue({ id: "rec1" });

    const payload = { name: "Bricks", quantity: 10 };
    await offlineManager.addMutation({
      table: "materials",
      type: "INSERT",
      payload,
      queryKey: ["materials", "p1"],
      userId: "u1",
    });
    await flush();

    expect(executePbMutation).toHaveBeenCalledWith({
      table: "materials",
      operation: "INSERT",
      payload: { ...payload, client_mutation_id: expect.any(String) },
    });
    expect(offlineManager.getQueueSize()).toBe(0);
  });

  it("keeps failed mutations in the queue with an incremented retry count", async () => {
    (executePbMutation as any).mockRejectedValue(new Error("Network down"));

    const events = await captureEvents(async () => {
      await offlineManager.addMutation({
        table: "materials",
        type: "INSERT",
        payload: { name: "Steel" },
        queryKey: ["materials", "p1"],
        userId: "u1",
      });
      await flush();
    });

    expect(offlineManager.getQueueSize()).toBe(1);
    expect(events.some((e) => e.type === "mutation_retrying")).toBe(true);
  });

  it("moves corrupted payloads to the dead letter queue without calling the executor", async () => {
    // inited queue with a payload that is not valid base64/JSON
    const corrupted = {
      id: "bad1",
      table: "materials",
      type: "INSERT",
      payload: "!!!not-base64-json!!!",
      queryKey: ["materials", "p1"],
      userId: "u1",
      retries: 0,
      createdAt: new Date().toISOString(),
    };
    store.set("offline_mutation_queue", [corrupted]);

    const events: OfflineSyncEvent[] = [];
    const unsub = offlineManager.onSyncEvent((e) => events.push(e));
    await offlineManager.init();
    await offlineManager.processQueue();
    await flush();
    unsub();

    expect(executePbMutation).not.toHaveBeenCalled();
    expect(offlineManager.getQueueSize()).toBe(0);
    expect(events.some((e) => e.type === "mutation_failed")).toBe(true);
  });

  it("replays a comment mutation with content intact (no redaction)", async () => {
    (executePbMutation as any).mockResolvedValue({ id: "c1" });

    const payload = { project_id: "p1", user_id: "u1", content: "Concrete pour notes" };
    await offlineManager.addMutation({
      table: "comments",
      type: "INSERT",
      payload,
      queryKey: ["comments", "p1"],
      userId: "u1",
    });
    await flush();

    expect(executePbMutation).toHaveBeenCalledWith({
      table: "comments",
      operation: "INSERT",
      payload: { ...payload, client_mutation_id: expect.any(String) },
    });
    expect((executePbMutation as any).mock.calls[0][0].payload.content).toBe("Concrete pour notes");
  });

  it("moves legacy [REDACTED] entries to dead-letter on init", async () => {
    const redactedPayload = btoa(JSON.stringify({ content: "[REDACTED]" }));
    const legacy = {
      id: "legacy1",
      table: "comments",
      type: "INSERT",
      payload: redactedPayload,
      queryKey: ["comments", "p1"],
      userId: "u1",
      retries: 0,
      createdAt: new Date().toISOString(),
    };
    store.set("offline_mutation_queue", [legacy]);

    await offlineManager.init();
    await flush();

    expect(offlineManager.getQueueSize()).toBe(0);
    expect(executePbMutation).not.toHaveBeenCalled();
  });

  it("scopes queues per user: user B never replays user A's mutations", async () => {
    (executePbMutation as any).mockResolvedValue({ id: "ok" });

    // seed queue as user A
    await offlineManager.init("userA");
    await offlineManager.addMutation({
      table: "materials",
      type: "INSERT",
      payload: { name: "A's item" },
      queryKey: ["materials", "p1"],
      userId: "userA",
    });
    await flush();
    expect(offlineManager.getQueueSize()).toBe(0); // replayed for A

    // switch to user B
    await offlineManager.init("userB");
    await flush();
    expect(offlineManager.getQueueSize()).toBe(0);
    expect(executePbMutation).toHaveBeenCalledTimes(1); // only A's single replay
  });

  it("legacy unscoped queue is quarantined to offline_unscoped_backup instead of adopted (SEC-004)", async () => {
    (executePbMutation as any).mockResolvedValue({ id: "ok" });
    const legacy = {
      id: "legacy2",
      table: "materials",
      type: "INSERT",
      payload: btoa(JSON.stringify({ name: "legacy item" })),
      queryKey: ["materials", "p1"],
      userId: "userA",
      retries: 0,
      createdAt: new Date().toISOString(),
    };
    store.set("offline_mutation_queue", [legacy]);

    await offlineManager.init("userB");
    await flush();

    // legacy entry is NOT adopted into user B's queue
    expect(offlineManager.getQueueSize()).toBe(0);
    expect(store.has("offline_mutation_queue")).toBe(false);
    const backup = store.get("offline_unscoped_backup") as any[];
    expect(backup).toHaveLength(1);
    expect(backup[0].id).toBe("legacy2");
  });

  it("round-trips Arabic text byte-identically (no base64)", async () => {
    (executePbMutation as any).mockResolvedValue({ id: "ok" });

    const payload = { name: "خرسانة", description: "وصف عربي" };
    await offlineManager.addMutation({
      table: "materials",
      type: "INSERT",
      payload,
      queryKey: ["materials", "p1"],
      userId: "u1",
    });
    await flush();

    expect(executePbMutation).toHaveBeenCalledWith({
      table: "materials",
      operation: "INSERT",
      payload: { ...payload, client_mutation_id: expect.any(String) },
    });
    expect((executePbMutation as any).mock.calls[0][0].payload.name).toBe("خرسانة");
  });

  it("decodes legacy base64 entries", async () => {
    (executePbMutation as any).mockResolvedValue({ id: "ok" });
    const legacy = {
      id: "legacy3",
      table: "materials",
      type: "INSERT",
      payload: btoa(JSON.stringify({ name: "old entry" })),
      queryKey: ["materials", "p1"],
      userId: "u1",
      retries: 0,
      createdAt: new Date().toISOString(),
    };
    store.set("offline_mutation_queue_u1", [legacy]);

    await offlineManager.init("u1");
    await offlineManager.processQueue();
    await flush();

    expect(executePbMutation).toHaveBeenCalledWith({
      table: "materials",
      operation: "INSERT",
      payload: { name: "old entry" },
    });
  });

  it("tags INSERT payloads with a client_mutation_id", async () => {
    (executePbMutation as any).mockResolvedValue({ id: "ok" });

    await offlineManager.addMutation({
      table: "materials",
      type: "INSERT",
      payload: { name: "Bricks" },
      queryKey: ["materials", "p1"],
      userId: "u1",
    });
    await flush();

    const call = (executePbMutation as any).mock.calls[0][0];
    expect(call.payload.client_mutation_id).toBeTruthy();
    expect(typeof call.payload.client_mutation_id).toBe("string");
  });

  it("treats a client_mutation_id unique conflict as success (drains queue)", async () => {
    const conflictErr = new Error(
      "UNIQUE constraint failed: materials.client_mutation_id",
    );
    (executePbMutation as any).mockRejectedValue(conflictErr);

    const events: OfflineSyncEvent[] = [];
    const unsub = offlineManager.onSyncEvent((e) => events.push(e));
    await offlineManager.addMutation({
      table: "materials",
      type: "INSERT",
      payload: { name: "Bricks" },
      queryKey: ["materials", "p1"],
      userId: "u1",
    });
    await flush();
    unsub();

    // queue drained, no dead-letter, no retry events
    expect(offlineManager.getQueueSize()).toBe(0);
    expect(events.some((e) => e.type === "mutation_retrying" || e.type === "mutation_failed")).toBe(false);
  });

  describe("dead-letter queue inspection and recovery", () => {
    beforeEach(async () => {
      // Force an item into the dead-letter queue by failing 3 retries
      (executePbMutation as any).mockRejectedValue(new Error("Server 500 error"));
      await offlineManager.addMutation({
        table: "materials",
        type: "INSERT",
        payload: { name: "Failed Item" },
        queryKey: ["materials", "p1"],
        userId: "u1",
      });
      // Run through 3 retries
      await flush(); // Attempt 1 -> retries=1
      await (offlineManager as any).processQueue();
      await flush(); // Attempt 2 -> retries=2
      await (offlineManager as any).processQueue();
      await flush(); // Attempt 3 -> retries=3 -> dead letter!
    });

    it("moves exhausted mutation to deadLetterQueue and allows inspection", () => {
      expect(offlineManager.getQueueSize()).toBe(0);
      expect(offlineManager.getDeadLetterSize()).toBe(1);

      const deadItems = offlineManager.getDeadLetterQueue();
      expect(deadItems.length).toBe(1);
      expect(deadItems[0].table).toBe("materials");
      expect(deadItems[0].error).toBe("Server 500 error");
    });

    it("retries a dead-letter item by moving it back to the active queue with reset retries", async () => {
      const deadItems = offlineManager.getDeadLetterQueue();
      const mutationId = deadItems[0].id;

      // Mock executor to succeed on next attempt
      (executePbMutation as any).mockResolvedValue({ id: "recovered" });

      await offlineManager.retryDeadLetter(mutationId);
      await flush();

      // Item should be processed and cleared
      expect(offlineManager.getDeadLetterSize()).toBe(0);
      expect(offlineManager.getQueueSize()).toBe(0);
    });

    it("dismisses a single dead-letter item from the queue", async () => {
      const deadItems = offlineManager.getDeadLetterQueue();
      const mutationId = deadItems[0].id;

      await offlineManager.dismissDeadLetter(mutationId);

      expect(offlineManager.getDeadLetterSize()).toBe(0);
      expect(offlineManager.getDeadLetterQueue()).toEqual([]);
    });

    it("clears all dead-letter items", async () => {
      await offlineManager.clearDeadLetters();
      expect(offlineManager.getDeadLetterSize()).toBe(0);
    });
  });

    describe("relation cascade & optimistic ID remapping (CRIT-04)", () => {
    it("pure remapPayload correctly handles foreign keys, arrays, and nested data", () => {
      const map = new Map<string, string>([
        ["opt-proj-1", "srv-proj-15chr"],
        ["opt-grp-1", "srv-grp-15char"],
        ["opt-mat-1", "srv-mat-15char"],
      ]);

      // Direct relation remapping
      const payload1 = {
        project_id: "opt-proj-1",
        group_id: "opt-grp-1",
        name: "Steel",
      };
      expect(remapPayload(payload1, map)).toEqual({
        project_id: "srv-proj-15chr",
        group_id: "srv-grp-15char",
        name: "Steel",
      });

      // Array of IDs (BULK_DELETE)
      const payload2 = ["opt-mat-1", "other-mat-2"];
      expect(remapPayload(payload2, map)).toEqual([
        "srv-mat-15char",
        "other-mat-2",
      ]);

      // BULK_UPDATE nested structure
      const payload3 = {
        ids: ["opt-mat-1"],
        data: {
          group_id: "opt-grp-1",
        },
      };
      expect(remapPayload(payload3, map)).toEqual({
        ids: ["srv-mat-15char"],
        data: {
          group_id: "srv-grp-15char",
        },
      });
    });

    it("pure remapQueryKey correctly replaces optimistic IDs", () => {
      const map = new Map<string, string>([["opt-proj-1", "srv-proj-15chr"]]);
      expect(remapQueryKey(["materials", "opt-proj-1"], map)).toEqual([
        "materials",
        "srv-proj-15chr",
      ]);
    });

    it("remaps project_id on child items when parent project gets a server-assigned ID", async () => {
      const optimisticProjectId = "proj-uuid-1111";
      const serverProjectId = "srv_prj_15chars";

      // When projects insert is called, return server assigned ID
      (executePbMutation as any).mockImplementation(async (args: any) => {
        if (args.table === "projects" && args.operation === "INSERT") {
          return { id: serverProjectId, name: args.payload.name };
        }
        if (args.table === "materials" && args.operation === "INSERT") {
          return { id: "srv_mat_15chars", ...args.payload };
        }
        return { id: "mock-id" };
      });

      // Turn offline so mutations accumulate in queue
      offlineManager.setIsOnline(false);

      await offlineManager.addMutation({
        table: "projects",
        type: "INSERT",
        payload: { id: optimisticProjectId, name: "New Bridge" },
        queryKey: ["myProjects"],
        userId: "u1",
      });

      await offlineManager.addMutation({
        table: "materials",
        type: "INSERT",
        payload: {
          id: "mat-uuid-1111",
          project_id: optimisticProjectId,
          name: "Concrete",
        },
        queryKey: ["materials", optimisticProjectId],
        userId: "u1",
      });

      expect(offlineManager.getQueueSize()).toBe(2);

      // Now come online and process queue
      offlineManager.setIsOnline(true);
      await offlineManager.processQueue();
      await flush();

      expect(offlineManager.getQueueSize()).toBe(0);
      expect(executePbMutation).toHaveBeenCalledTimes(2);

      // Verify materials was called with the remapped server project ID
      const materialCall = (executePbMutation as any).mock.calls.find(
        (c: any) => c[0].table === "materials",
      );
      expect(materialCall).toBeTruthy();
      expect(materialCall[0].payload.project_id).toBe(serverProjectId);
    });

    it("cascades multi-level relations: Project -> Group -> Line Item", async () => {
      const optProjectId = "opt-proj-uuid";
      const srvProjectId = "srv_p_123456789";
      const optGroupId = "opt-grp-uuid";
      const srvGroupId = "srv_g_123456789";
      const optMatId = "opt-mat-uuid";
      const srvMatId = "srv_m_123456789";

      (executePbMutation as any).mockImplementation(async (args: any) => {
        if (args.table === "projects") return { id: srvProjectId };
        if (args.table === "project_groups") return { id: srvGroupId };
        if (args.table === "materials") return { id: srvMatId };
        return { id: "ok" };
      });

      offlineManager.setIsOnline(false);

      // 1. Create Project
      await offlineManager.addMutation({
        table: "projects",
        type: "INSERT",
        payload: { id: optProjectId, name: "Hospital" },
        queryKey: ["myProjects"],
        userId: "u1",
      });

      // 2. Create Group under Project
      await offlineManager.addMutation({
        table: "project_groups",
        type: "INSERT",
        payload: { id: optGroupId, project_id: optProjectId, name: "Substructure" },
        queryKey: ["project_groups", optProjectId],
        userId: "u1",
      });

      // 3. Create Material under Project & Group
      await offlineManager.addMutation({
        table: "materials",
        type: "INSERT",
        payload: {
          id: optMatId,
          project_id: optProjectId,
          group_id: optGroupId,
          name: "Reinforcing Steel",
        },
        queryKey: ["materials", optProjectId],
        userId: "u1",
      });

      // 4. Update Material
      await offlineManager.addMutation({
        table: "materials",
        type: "UPDATE",
        payload: { id: optMatId, quantity: 200 },
        queryKey: ["materials", optProjectId],
        userId: "u1",
      });

      offlineManager.setIsOnline(true);
      await offlineManager.processQueue();
      await flush();

      expect(offlineManager.getQueueSize()).toBe(0);
      expect(executePbMutation).toHaveBeenCalledTimes(4);

      // Verify Group creation received server Project ID
      const groupCall = (executePbMutation as any).mock.calls[1][0];
      expect(groupCall.table).toBe("project_groups");
      expect(groupCall.payload.project_id).toBe(srvProjectId);

      // Verify Material creation received both server Project ID and Group ID
      const materialCreateCall = (executePbMutation as any).mock.calls[2][0];
      expect(materialCreateCall.table).toBe("materials");
      expect(materialCreateCall.payload.project_id).toBe(srvProjectId);
      expect(materialCreateCall.payload.group_id).toBe(srvGroupId);

      // Verify Material update received server Material ID
      const materialUpdateCall = (executePbMutation as any).mock.calls[3][0];
      expect(materialUpdateCall.table).toBe("materials");
      expect(materialUpdateCall.operation).toBe("UPDATE");
      expect(materialUpdateCall.payload.id).toBe(srvMatId);
    });

    it("emits id_remapped sync events when optimistic IDs are resolved", async () => {
      (executePbMutation as any).mockResolvedValue({ id: "srv_15characters" });

      const events: OfflineSyncEvent[] = [];
      const unsub = offlineManager.onSyncEvent((e) => events.push(e));

      await offlineManager.addMutation({
        table: "projects",
        type: "INSERT",
        payload: { id: "optimistic-uuid-xyz", name: "Tower" },
        queryKey: ["myProjects"],
        userId: "u1",
      });

      await flush();
      unsub();

      const remappedEvent = events.find((e) => e.type === "id_remapped");
      expect(remappedEvent).toEqual({
        type: "id_remapped",
        oldId: "optimistic-uuid-xyz",
        newId: "srv_15characters",
        table: "projects",
      });
    });
  });

  describe("OFFL-04: transient network interruption during replay", () => {
    it("pauses replay and preserves mutations without burning retry limit on network failure", async () => {
      (executePbMutation as any)
        .mockResolvedValueOnce({ id: "srv_mat_1" })
        .mockRejectedValueOnce({ status: 0, message: "Network connection lost" });

      offlineManager.setIsOnline(false);
      await offlineManager.addMutation({
        table: "materials",
        type: "INSERT",
        payload: { name: "Item 1" },
        queryKey: ["materials"],
        userId: "u1",
      });
      await offlineManager.addMutation({
        table: "materials",
        type: "INSERT",
        payload: { name: "Item 2" },
        queryKey: ["materials"],
        userId: "u1",
      });
      await offlineManager.addMutation({
        table: "materials",
        type: "INSERT",
        payload: { name: "Item 3" },
        queryKey: ["materials"],
        userId: "u1",
      });

      expect(offlineManager.getQueueSize()).toBe(3);

      offlineManager.setIsOnline(true);
      await flush();

      expect(offlineManager.getIsOnline()).toBe(false);
      expect(offlineManager.getQueueSize()).toBe(2);
      expect(offlineManager.getDeadLetterSize()).toBe(0);
      expect(executePbMutation).toHaveBeenCalledTimes(2);
    });
  });

  describe("OFFL-05: 404 on DELETE replay", () => {
    it("drains DELETE mutation as successful when server returns 404 (already deleted)", async () => {
      (executePbMutation as any).mockRejectedValueOnce({
        status: 404,
        message: "The requested resource wasn't found.",
      });

      await offlineManager.addMutation({
        table: "materials",
        type: "DELETE",
        payload: { id: "already_deleted_id" },
        queryKey: ["materials"],
        userId: "u1",
      });

      await flush();

      // Mutation must be drained from queue and NOT placed into dead letter queue
      expect(offlineManager.getQueueSize()).toBe(0);
      expect(offlineManager.getDeadLetterSize()).toBe(0);
      expect(executePbMutation).toHaveBeenCalledTimes(1);
    });
  });
});
