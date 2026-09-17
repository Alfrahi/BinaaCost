import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/shared/lib/pb-executor", () => ({
  executePbMutation: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
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

import { executePbMutation } from "@/shared/lib/pb-executor";
import { toast } from "sonner";
import { offlineManager } from "@/shared/lib/offline";

const flush = async () => {
  // let addMutation/processQueue promise chains settle
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

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

    await offlineManager.addMutation({
      table: "materials",
      type: "INSERT",
      payload: { name: "Steel" },
      queryKey: ["materials", "p1"],
      userId: "u1",
    });
    await flush();

    expect(offlineManager.getQueueSize()).toBe(1);
    expect(toast.warning).toHaveBeenCalled();
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

    await offlineManager.init();
    await offlineManager.processQueue();
    await flush();

    expect(executePbMutation).not.toHaveBeenCalled();
    expect(offlineManager.getQueueSize()).toBe(0);
    expect(toast.error).toHaveBeenCalled();
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

  it("legacy unscoped queue migrates into the first user's namespace", async () => {
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

    await offlineManager.init("userA");
    await flush();

    // legacy entry was adopted into user A's queue (replayed on next sync)
    expect(offlineManager.getQueueSize()).toBe(1);
    expect(store.has("offline_mutation_queue")).toBe(false);
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

    await offlineManager.addMutation({
      table: "materials",
      type: "INSERT",
      payload: { name: "Bricks" },
      queryKey: ["materials", "p1"],
      userId: "u1",
    });
    await flush();

    // queue drained, no dead-letter, no retry toast
    expect(offlineManager.getQueueSize()).toBe(0);
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
