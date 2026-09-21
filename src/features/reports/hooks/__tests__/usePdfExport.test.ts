import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfExport } from "../usePdfExport";

const mockGeneratePDF = vi.fn();

vi.mock("react-to-pdf", () => ({
  default: (...args: any[]) => mockGeneratePDF(...args),
}));

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

describe("usePdfExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generatePDF with white background and onclone that cleans dark mode classes", async () => {
    mockGeneratePDF.mockResolvedValueOnce({});

    const { result } = renderHook(() => usePdfExport());

    const dummyTarget = document.createElement("div");
    const targetRef = { current: dummyTarget };

    await act(async () => {
      await result.current.generatePdf("projectCost", targetRef as any, "TestProject");
    });

    expect(mockGeneratePDF).toHaveBeenCalledTimes(1);
    const options = mockGeneratePDF.mock.calls[0][1];

    expect(options.filename).toBe("TestProject_Detailed_Cost_Report.pdf");
    expect(options.overrides?.canvas?.backgroundColor).toBe("#ffffff");
    expect(typeof options.overrides?.canvas?.onclone).toBe("function");

    // Test onclone function
    const mockDoc = document.implementation.createHTMLDocument();
    mockDoc.documentElement.classList.add("dark");
    mockDoc.body.classList.add("dark");
    const innerDarkEl = mockDoc.createElement("div");
    innerDarkEl.classList.add("dark");
    mockDoc.body.appendChild(innerDarkEl);

    options.overrides.canvas.onclone(mockDoc);

    expect(mockDoc.documentElement.classList.contains("dark")).toBe(false);
    expect(mockDoc.body.classList.contains("dark")).toBe(false);
    expect(innerDarkEl.classList.contains("dark")).toBe(false);
  });
});
