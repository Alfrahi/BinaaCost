import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePublicShare } from "../usePublicShare";

describe("usePublicShare", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("VITE_POCKETBASE_URL", "http://localhost:8090");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("probes without password and sets password_protected state on 403 Incorrect password", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Incorrect password required" }),
    });

    const { result } = renderHook(() => usePublicShare("test-token"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.shareData).toEqual({ password_protected: true });
  });

  it("handles successful response when link is not password protected", async () => {
    const mockData = {
      project: { id: "p1", name: "Test Project", financial_settings: {} },
      materials: [],
      labor: [],
      equipment: [],
      additional: [],
      risks: [],
      groups: [],
      expires_at: "2099-01-01",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const { result } = renderHook(() => usePublicShare("test-token"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.shareData).toEqual(mockData);
  });
});
