import { describe, it, expect, beforeEach, vi } from "vitest";

const collectionMock = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: vi.fn(() => collectionMock),
  },
}));

vi.mock("@/integrations/pocketbase/routes", () => ({
  callRoute: vi.fn(async (name: string) => {
    throw new Error(`Unknown PocketBase route: ${name}`);
  }),
}));

import { executePbMutation } from "@/lib/pb-executor";
import { callRoute } from "@/integrations/pocketbase/routes";

describe("executePbMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("INSERT creates one record", async () => {
    collectionMock.create.mockResolvedValue({ id: "abc" });
    const payload = { name: "Mat" };
    const result = await executePbMutation({
      table: "materials",
      operation: "INSERT",
      payload,
    });
    expect(collectionMock.create).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: "abc" });
  });

  it("UPDATE requires an id", async () => {
    await expect(
      executePbMutation({ table: "materials", operation: "UPDATE", payload: {} }),
    ).rejects.toThrow("Update requires ID");
  });

  it("UPDATE calls update with id and payload", async () => {
    collectionMock.update.mockResolvedValue({ id: "abc", name: "New" });
    const payload = { id: "abc", name: "New" };
    await executePbMutation({ table: "materials", operation: "UPDATE", payload });
    expect(collectionMock.update).toHaveBeenCalledWith("abc", payload);
  });

  it("DELETE requires an id and resolves null", async () => {
    await expect(
      executePbMutation({ table: "materials", operation: "DELETE", payload: {} }),
    ).rejects.toThrow("Delete requires ID");

    const result = await executePbMutation({
      table: "materials",
      operation: "DELETE",
      payload: { id: "abc" },
    });
    expect(collectionMock.delete).toHaveBeenCalledWith("abc");
    expect(result).toBeNull();
  });

  it("BULK_DELETE deletes each id sequentially", async () => {
    const order: string[] = [];
    collectionMock.delete.mockImplementation(async (id: string) => {
      order.push(id);
    });
    await executePbMutation({
      table: "materials",
      operation: "BULK_DELETE",
      payload: ["a", "b", "c"],
    });
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("BULK_UPDATE updates each id with the same data", async () => {
    collectionMock.update.mockResolvedValue({});
    await executePbMutation({
      table: "materials",
      operation: "BULK_UPDATE",
      payload: { ids: ["a", "b"], data: { archived: true } },
    });
    expect(collectionMock.update).toHaveBeenCalledTimes(2);
    expect(collectionMock.update).toHaveBeenNthCalledWith(1, "a", {
      archived: true,
    });
    expect(collectionMock.update).toHaveBeenNthCalledWith(2, "b", {
      archived: true,
    });
  });

  it("UPSERT delegates to the upsert route registry", async () => {
    await expect(
      executePbMutation({ table: "library_labor", operation: "UPSERT", payload: {} }),
    ).rejects.toThrow("Unknown PocketBase route: upsert/library_labor");
    expect(callRoute).toHaveBeenCalledWith("upsert/library_labor", {});
  });

  it("RPC delegates to the route registry", async () => {
    await expect(
      executePbMutation({ table: "missing_rpc", operation: "RPC", payload: { x: 1 } }),
    ).rejects.toThrow("Unknown PocketBase route: missing_rpc");
    expect(callRoute).toHaveBeenCalledWith("missing_rpc", { x: 1 });
  });

  it("propagates collection errors (offline retry sees a rejection)", async () => {
    collectionMock.create.mockRejectedValue(new Error("400 Bad Request"));
    await expect(
      executePbMutation({ table: "materials", operation: "INSERT", payload: {} }),
    ).rejects.toThrow("400 Bad Request");
  });
});
