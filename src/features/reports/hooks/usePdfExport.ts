import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { pb } from "@/integrations/pocketbase/client";

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
        const filename =
          reportType === "clientProposal"
            ? `${filenamePrefix}_Client_Proposal.pdf`
            : `${filenamePrefix}_Detailed_Cost_Report.pdf`;

        if (!targetRef.current) throw new Error("No target ref");

        // Prepare HTML for backend
        const cloned = targetRef.current.cloneNode(true) as HTMLElement;
        
        const headHtml = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => el.outerHTML)
          .join('\n');

        const htmlContent = `
          <!DOCTYPE html>
          <html dir="${document.documentElement.dir || 'rtl'}" lang="${document.documentElement.lang || 'ar'}">
            <head>
              <meta charset="utf-8">
              <base href="http://127.0.0.1:8090/">
              ${headHtml}
              <style>
                body { padding: 20px; background: white; color: black; }
                /* Ensure background colors and borders print correctly in headless chromium */
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                /* Fix table breaking and overflow issues */
                .overflow-x-auto, .overflow-auto, .overflow-hidden, [class*='overflow'] { overflow: visible !important; max-height: none !important; }
                table { page-break-inside: auto; break-inside: auto; width: 100% !important; max-width: 100% !important; }
                tr { page-break-inside: avoid; break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
                td, th { white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
                .whitespace-nowrap { white-space: normal !important; }
              </style>
            </head>
            <body>${cloned.outerHTML}</body>
          </html>`;



        // The response might be a blob if using fetch, but pb.send might return JSON or blob.
        // Wait, pb.send automatically parses JSON. If we want a blob, we might need a custom fetch.
        const res = await fetch(pb.buildUrl("/api/generate-pdf"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": pb.authStore.token
          },
          body: JSON.stringify({ html: htmlContent })
        });
        
        if (!res.ok) throw new Error("Failed to generate PDF");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

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
