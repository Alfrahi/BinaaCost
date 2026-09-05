// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the pocketbase module and env before importing client.ts, so the
// module-level `new PocketBase(...)` and env check don't run against a real
// server.
const hoisted = vi.hoisted(() => {
  const state: {
    afterSend: ((response: any, data: any) => any) | null;
    authStore: Record<string, any>;
  } = {
    afterSend: null,
    authStore: {
      record: { id: "user-123" },
      isValid: true,
      isAdmin: false,
      isSuperuser: false,
      clear: vi.fn(),
    },
  };
  return state;
});

vi.mock("pocketbase", () => {
  return {
    default: class {
      authStore = hoisted.authStore;
      afterSend: any = null;
    },
  };
});

vi.stubEnv("VITE_POCKETBASE_URL", "http://127.0.0.1:8090");

import { pb } from "@/integrations/pocketbase/client";

function runAfterSend(status: number, url: string) {
  return (pb as any).afterSend({ status, url }, {});
}

describe("client.ts stale-session healing (pb.afterSend)", () => {
  beforeEach(() => {
    hoisted.authStore.record = { id: "user-123" };
    hoisted.authStore.isValid = true;
    hoisted.authStore.isAdmin = false;
    hoisted.authStore.isSuperuser = false;
    hoisted.authStore.clear.mockClear();
  });

  it("does NOT clear session on a 404 for a non-user resource", () => {
    runAfterSend(404, "/api/collections/projects/records/missing-id");
    expect(hoisted.authStore.clear).not.toHaveBeenCalled();
  });

  it("does NOT clear session on a 401 for a non-auth, non-own-user request", () => {
    runAfterSend(401, "/api/collections/projects/records");
    expect(hoisted.authStore.clear).not.toHaveBeenCalled();
  });

  it("clears session on 404 for the authenticated user's own record", () => {
    runAfterSend(404, "/api/collections/users/records/user-123");
    expect(hoisted.authStore.clear).toHaveBeenCalled();
  });

  it("clears session on 401 from an auth endpoint", () => {
    runAfterSend(401, "/api/collections/users/auth-refresh");
    expect(hoisted.authStore.clear).toHaveBeenCalled();
  });

  it("does NOT clear session for a different user's record 404", () => {
    runAfterSend(404, "/api/collections/users/records/someone-else");
    expect(hoisted.authStore.clear).not.toHaveBeenCalled();
  });

  it("does nothing when already signed out", () => {
    hoisted.authStore.isValid = false;
    runAfterSend(404, "/api/collections/users/records/user-123");
    expect(hoisted.authStore.clear).not.toHaveBeenCalled();
  });
});