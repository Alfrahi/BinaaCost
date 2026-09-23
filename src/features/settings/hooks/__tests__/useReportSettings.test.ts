import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReportSettings, DEFAULT_REPORT_SETTINGS } from "../useReportSettings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { server } from "@/tests/setup";
import { http, HttpResponse } from "msw";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (k: string) => k,
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useReportSettings", () => {
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

  it("exports DEFAULT_REPORT_SETTINGS with empty values", () => {
    expect(DEFAULT_REPORT_SETTINGS.company_name).toBe("");
    expect(DEFAULT_REPORT_SETTINGS.company_website).toBe("");
    expect(DEFAULT_REPORT_SETTINGS.company_email).toBe("");
    expect(DEFAULT_REPORT_SETTINGS.default_terms).toBe("");
  });

  it("updates existing report_settings record in app_settings collection", async () => {
    let patchCalled = false;
    server.use(
      http.get("*/api/collections/app_settings/records", () => {
        return HttpResponse.json({
          page: 1,
          perPage: 1,
          totalItems: 1,
          totalPages: 1,
          items: [{
            id: "rec-123",
            key: "report_settings",
            value: { company_name: "Old Corp", company_website: "https://old.com" },
          }]
        });
      }),
      http.patch("*/api/collections/app_settings/records/:id", async ({ request, params }) => {
        const data = await request.json() as any;
        expect(params.id).toBe("rec-123");
        expect(data.value.company_name).toBe("Acme Enterprises");
        patchCalled = true;
        return HttpResponse.json({ id: "rec-123" });
      })
    );

    const { result } = renderHook(() => useReportSettings(), { wrapper });

    await act(async () => {
      await result.current.updateReportSettings.mutateAsync({
        company_name: "Acme Enterprises",
        company_website: "https://acme.com",
      } as any);
    });

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
    });
    
    expect(patchCalled).toBe(true);
  });

  it("creates new report_settings record if none exists (404)", async () => {
    let postCalled = false;
    server.use(
      http.get("*/api/collections/app_settings/records", () => {
        return HttpResponse.json(
          { message: "The requested resource wasn't found." },
          { status: 404 }
        );
      }),
      http.post("*/api/collections/app_settings/records", async ({ request }) => {
        const data = await request.json() as any;
        expect(data.key).toBe("report_settings");
        expect(data.value.company_name).toBe("New Global Corp");
        postCalled = true;
        return HttpResponse.json({ id: "new-rec" });
      })
    );

    const { result } = renderHook(() => useReportSettings(), { wrapper });

    await act(async () => {
      await result.current.updateReportSettings.mutateAsync({
        company_name: "New Global Corp",
        company_email: "contact@global.com",
      } as any);
    });

    await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
    });
    
    expect(postCalled).toBe(true);
  });
});
