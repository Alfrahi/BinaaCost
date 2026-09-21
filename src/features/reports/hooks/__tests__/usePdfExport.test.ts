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
    expect(options.overrides?.canvas?.windowWidth).toBe(1200);
    expect(typeof options.overrides?.canvas?.onclone).toBe("function");

    // Test onclone function
    const mockDoc = document.implementation.createHTMLDocument();
    mockDoc.documentElement.classList.add("dark");
    mockDoc.body.classList.add("dark");

    const ancestor = mockDoc.createElement("div");
    ancestor.style.maxHeight = "600px";
    ancestor.style.overflow = "hidden";
    mockDoc.body.appendChild(ancestor);

    const reportRoot = mockDoc.createElement("div");
    reportRoot.setAttribute("data-report-root", "true");
    reportRoot.classList.add("dark");
    ancestor.appendChild(reportRoot);

    const tableWrapper = mockDoc.createElement("div");
    tableWrapper.classList.add("overflow-x-auto");
    reportRoot.appendChild(tableWrapper);

    const tableEl = mockDoc.createElement("table");
    reportRoot.appendChild(tableEl);

    options.overrides.canvas.onclone(mockDoc);

    expect(mockDoc.documentElement.classList.contains("dark")).toBe(false);
    expect(mockDoc.body.classList.contains("dark")).toBe(false);
    expect(reportRoot.classList.contains("dark")).toBe(false);

    expect(mockDoc.documentElement.style.width).toBe("1120px");
    expect(mockDoc.body.style.width).toBe("1120px");
    expect(reportRoot.style.width).toBe("1120px");
    expect(reportRoot.style.minWidth).toBe("1120px");
    expect(reportRoot.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(ancestor.style.maxHeight).toBe("none");
    expect(ancestor.style.overflow).toBe("visible");
    expect(ancestor.style.width).toBe("1120px");
    expect(tableWrapper.style.overflow).toBe("visible");
    expect(tableWrapper.style.width).toBe("100%");
    expect(tableEl.style.width).toBe("100%");
    expect(tableEl.style.tableLayout).toBe("auto");
  });
});
