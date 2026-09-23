import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCostDatabaseItems } from "../useCostDatabaseItems";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { server } from "@/tests/setup";
import { http, HttpResponse } from "msw";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "user-item-test-456" } }),
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

describe("useCostDatabaseItems - user_id injection", () => {
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

  it("injects logged in user_id into createItem", async () => {
    let capturedPayload: any = null;
    
    server.use(
      http.post("*/api/collections/cost_database_items/records", async ({ request }) => {
        capturedPayload = await request.json();
        return HttpResponse.json({ id: "item-1" });
      })
    );

    const { result } = renderHook(() => useCostDatabaseItems("db-1"), { wrapper });

    await act(async () => {
      await result.current.createItem.mutateAsync({
        database_id: "db-1",
        csi_division: "03",
        csi_code: "03 30 00",
        description: "Cast-in-Place Concrete",
        unit: "m3",
        unit_price: 150,
      } as any);
    });


    expect(capturedPayload).toMatchObject({
        user_id: "user-item-test-456",
        csi_division: "03",
    });
  });
});
