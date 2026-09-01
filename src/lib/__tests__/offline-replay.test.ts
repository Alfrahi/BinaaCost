import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/pb-executor", () => ({
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
  },
}));

import { executePbMutation } from "@/lib/pb-executor";
import { toast } from "sonner";
import { offlineManager } from "@/lib/offline";

const flush = async () => {
  // let addMutation/processQueue promise chains settle
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

describe("offline queue replay (PocketBase executor)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
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
      payload,
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
});
