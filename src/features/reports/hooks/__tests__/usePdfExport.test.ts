import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfExport } from "../usePdfExport";
import { server } from "@/tests/setup";
import { http, HttpResponse } from "msw";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    buildUrl: vi.fn((path) => `http://mocked-url${path}`),
    authStore: { token: "mock-token" },
  },
}));

const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
global.window.URL.createObjectURL = mockCreateObjectURL;
global.window.URL.revokeObjectURL = mockRevokeObjectURL;

describe("usePdfExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls fetch to generate PDF and triggers download", async () => {
    let requestBody: any;
    let requestHeaders: Headers | undefined;
    
    server.use(
      http.post("http://mocked-url/api/generate-pdf", async ({ request }) => {
        requestHeaders = request.headers;
        requestBody = await request.json();
        return new HttpResponse(new Blob(["test"], { type: "application/pdf" }), {
          status: 200,
        });
      })
    );

    mockCreateObjectURL.mockReturnValueOnce("blob:mock-url");

    const { result } = renderHook(() => usePdfExport());

    const dummyTarget = document.createElement("div");
    dummyTarget.innerHTML = "<h1>Test</h1>";
    const targetRef = { current: dummyTarget };

    // Mock document head for styles
    const styleEl = document.createElement("style");
    styleEl.innerHTML = "body { color: red; }";
    document.head.appendChild(styleEl);
    
    // Mock anchor click
    const clickSpy = vi.fn();
    const mockAnchor = document.createElement("a");
    mockAnchor.click = clickSpy;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: any) => {
      if (tag === "a") return mockAnchor;
      return originalCreateElement(tag);
    });

    await act(async () => {
      await result.current.generatePdf("projectCost", targetRef as any, "TestProject");
    });

    expect(requestHeaders?.get("Authorization")).toBe("mock-token");
    expect(requestBody?.html).toContain("<h1>Test</h1>");
    expect(requestBody?.html).toContain("body { color: red; }");
    expect(requestBody?.html).toContain('<base href="http://127.0.0.1:8090/">');
    expect(requestBody?.html).toContain("table { page-break-inside: auto; break-inside: auto; width: 100% !important; max-width: 100% !important; }");

    expect(mockAnchor.download).toBe("TestProject_Detailed_Cost_Report.pdf");
    expect(mockAnchor.href).toBe("blob:mock-url");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    
    document.head.removeChild(styleEl);
  });
});
