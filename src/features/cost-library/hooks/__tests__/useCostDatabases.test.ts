import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCostDatabases } from "../useCostDatabases";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { server } from "@/tests/setup";
import { http, HttpResponse } from "msw";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "user-test-789" } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en", dir: () => "ltr" },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useCostDatabases - user_id injection", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  it("injects logged in user_id into createDatabase", async () => {
    let capturedPayload: any = null;
    server.use(
      http.post("*/api/collections/cost_databases/records", async ({ request }) => {
        capturedPayload = await request.json();
        return HttpResponse.json({ id: "db-1" });
      })
    );

    const { result } = renderHook(() => useCostDatabases(), { wrapper });

    await act(async () => {
      await result.current.createDatabase.mutateAsync({
        name: "Commercial Database",
        currency: "USD",
        is_public: false,
      } as any);
    });


    expect(capturedPayload).toMatchObject({
        name: "Commercial Database",
        user_id: "user-test-789",
    });
  });

  it("preserves explicit user_id if already provided", async () => {
    let capturedPayload: any = null;
    server.use(
      http.post("*/api/collections/cost_databases/records", async ({ request }) => {
        capturedPayload = await request.json();
        return HttpResponse.json({ id: "db-2" });
      })
    );

    const { result } = renderHook(() => useCostDatabases(), { wrapper });

    await act(async () => {
      await result.current.createDatabase.mutateAsync({
        name: "Admin Database",
        currency: "EUR",
        is_public: true,
        user_id: "custom-user-id",
      } as any);
    });
    

    expect(capturedPayload).toMatchObject({
        name: "Admin Database",
        user_id: "custom-user-id",
    });
  });
});
