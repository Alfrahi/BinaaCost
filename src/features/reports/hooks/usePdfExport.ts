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
            canvas: {},
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
