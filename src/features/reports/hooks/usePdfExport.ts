import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function usePdfExport() {
  const { t } = useTranslation(["project_reports", "common"]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = useCallback(
    async (
      reportType: "clientProposal" | "projectCost",
      targetRef: React.RefObject<HTMLDivElement>,
      filenamePrefix: string,
    ) => {
      setIsGenerating(true);
      const toastId = toast.loading(t("common:generating"));

      try {
        const { default: generatePDF } = await import("react-to-pdf");

        const filename =
          reportType === "clientProposal"
            ? `${filenamePrefix}_Client_Proposal.pdf`
            : `${filenamePrefix}_Detailed_Cost_Report.pdf`;

        await generatePDF(targetRef, {
          filename: filename,
          method: "save",
          page: {
            format: "letter",
            orientation: "portrait",
            margin: 10,
          },
          overrides: {
            pdf: {
              compress: true,
            },
            canvas: {
              useCORS: true,
              backgroundColor: "#ffffff",
              windowWidth: 1200,
              onclone: (clonedDoc: Document, element?: HTMLElement) => {
                // Force light mode
                clonedDoc.documentElement.classList.remove("dark");
                clonedDoc.body?.classList.remove("dark");
                const darkElements = clonedDoc.querySelectorAll(".dark");
                darkElements.forEach((el) => el.classList.remove("dark"));

                // Ensure cloned document body has full printable width
                clonedDoc.documentElement.style.width = "1120px";
                clonedDoc.documentElement.style.minWidth = "1120px";
                if (clonedDoc.body) {
                  clonedDoc.body.style.width = "1120px";
                  clonedDoc.body.style.minWidth = "1120px";
                  clonedDoc.body.style.backgroundColor = "#ffffff";
                }

                // Locate the report root
                const reportRoot =
                  (clonedDoc.querySelector('[data-report-root="true"]') as HTMLElement | null) ||
                  (element as HTMLElement | null);

                if (reportRoot) {
                  reportRoot.style.width = "1120px";
                  reportRoot.style.minWidth = "1120px";
                  reportRoot.style.maxWidth = "none";
                  reportRoot.style.boxSizing = "border-box";
                  reportRoot.style.backgroundColor = "#ffffff";
                  reportRoot.style.color = "#0f172a";

                  // Remove overflow, max-width and height restrictions from ancestor elements in the cloned DOM
                  let current = reportRoot.parentElement;
                  while (current && current !== clonedDoc.body) {
                    current.style.maxHeight = "none";
                    current.style.height = "auto";
                    current.style.overflow = "visible";
                    current.style.width = "1120px";
                    current.style.minWidth = "1120px";
                    current.style.maxWidth = "none";
                    current.style.padding = "0";
                    current.style.margin = "0";
                    current.style.border = "none";
                    current = current.parentElement;
                  }

                  // Unconstrain all scroll wrappers within the report
                  const scrollContainers = reportRoot.querySelectorAll(
                    ".overflow-x-auto, .overflow-auto, [class*='overflow']",
                  );
                  scrollContainers.forEach((el) => {
                    const htmlEl = el as HTMLElement;
                    htmlEl.style.overflow = "visible";
                    htmlEl.style.width = "100%";
                    htmlEl.style.maxWidth = "none";
                  });

                  // Ensure all tables occupy full width with auto layout
                  let maxTableWidth = 1120;
                  const tables = reportRoot.querySelectorAll("table");
                  tables.forEach((tbl) => {
                    const htmlTable = tbl as HTMLElement;
                    htmlTable.style.width = "100%";
                    htmlTable.style.minWidth = "100%";
                    htmlTable.style.tableLayout = "auto";
                    if (tbl.scrollWidth > maxTableWidth) {
                      maxTableWidth = tbl.scrollWidth;
                    }
                  });

                  if (maxTableWidth > 1120) {
                    const expandedWidth = `${maxTableWidth + 64}px`;
                    reportRoot.style.width = expandedWidth;
                    reportRoot.style.minWidth = expandedWidth;
                    if (clonedDoc.body) {
                      clonedDoc.body.style.width = expandedWidth;
                      clonedDoc.body.style.minWidth = expandedWidth;
                    }
                    if (clonedDoc.documentElement) {
                      clonedDoc.documentElement.style.width = expandedWidth;
                      clonedDoc.documentElement.style.minWidth = expandedWidth;
                    }
                  }
                }
              },
            },
          },
        });
        toast.success(t("project_reports:success_pdfExport"));
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast.error(t("project_reports:errorGeneratingPDF"));
      } finally {
        setIsGenerating(false);
        toast.dismiss(toastId);
      }
    },
    [t],
  );

  return { generatePdf, isGenerating };
}
