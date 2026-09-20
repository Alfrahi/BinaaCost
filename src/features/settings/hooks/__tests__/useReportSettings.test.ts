import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportSettings, DEFAULT_REPORT_SETTINGS } from "../useReportSettings";
import { pb } from "@/integrations/pocketbase/client";

const mockInvalidateQueries = vi.fn();
const mockToastSuccess = vi.fn();

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

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
  useQuery: ({ queryFn: _queryFn }: any) => {
    return {
      data: undefined,
      isLoading: false,
      error: null,
    };
  },
  useMutation: ({ mutationFn, onSuccess }: any) => ({
    mutate: async (vars: any) => {
      const res = await mutationFn(vars);
      onSuccess(res);
      return res;
    },
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: vi.fn(),
  },
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: vi.fn(),
  },
}));

describe("useReportSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports DEFAULT_REPORT_SETTINGS with empty values", () => {
    expect(DEFAULT_REPORT_SETTINGS.company_name).toBe("");
    expect(DEFAULT_REPORT_SETTINGS.company_website).toBe("");
    expect(DEFAULT_REPORT_SETTINGS.company_email).toBe("");
    expect(DEFAULT_REPORT_SETTINGS.default_terms).toBe("");
  });

  it("updates existing report_settings record in app_settings collection", async () => {
    const existingRecord = {
      id: "rec-123",
      key: "report_settings",
      value: { company_name: "Old Corp", company_website: "https://old.com" },
    };

    const mockUpdate = vi.fn().mockResolvedValue({ id: "rec-123" });
    const mockCreate = vi.fn();
    const mockGetFirst = vi.fn().mockResolvedValue(existingRecord);

    (pb.collection as any).mockReturnValue({
      getFirstListItem: mockGetFirst,
      update: mockUpdate,
      create: mockCreate,
    });

    const { result } = renderHook(() => useReportSettings());

    await act(async () => {
      await result.current.updateReportSettings.mutate({
        company_name: "Acme Enterprises",
        company_website: "https://acme.com",
      });
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      "rec-123",
      expect.objectContaining({
        value: expect.objectContaining({
          company_name: "Acme Enterprises",
          company_website: "https://acme.com",
        }),
      }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["app_settings", "report_settings"],
    });
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("creates new report_settings record if none exists (404)", async () => {
    const mockUpdate = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({ id: "new-rec" });
    const mockGetFirst = vi.fn().mockRejectedValue({ status: 404 });

    (pb.collection as any).mockReturnValue({
      getFirstListItem: mockGetFirst,
      update: mockUpdate,
      create: mockCreate,
    });

    const { result } = renderHook(() => useReportSettings());

    await act(async () => {
      await result.current.updateReportSettings.mutate({
        company_name: "New Global Corp",
        company_email: "contact@global.com",
      });
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "report_settings",
        value: expect.objectContaining({
          company_name: "New Global Corp",
          company_email: "contact@global.com",
        }),
      }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["app_settings", "report_settings"],
    });
  });
});
