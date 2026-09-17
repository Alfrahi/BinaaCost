import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { callRouteWithParams } from "@/integrations/pocketbase/routes";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { ProjectFormValues } from "@/features/projects/project-core/types/form";

interface UseCurrencyConversionDialogProps {
  projectId: string;
  onConfirmConversion: (
    newCurrency: string,
    formData: ProjectFormValues,
  ) => Promise<void>;
  onCancelConversion: (originalCurrency: string) => void;
}

export function useCurrencyConversionDialog({
  projectId,
  onConfirmConversion,
  onCancelConversion,
}: UseCurrencyConversionDialogProps) {
  const { t } = useTranslation(["common"]);
  const { getMissingRates } = useCurrencyConverter();

  const [showDialog, setShowDialog] = useState(false);
  const [pendingNewCurrency, setPendingNewCurrency] = useState<string | null>(
    null,
  );
  const [originalCurrency, setOriginalCurrency] = useState<string | null>(null);
  const [formDataToSubmit, setFormDataToSubmit] =
    useState<ProjectFormValues | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (
      !projectId ||
      !originalCurrency ||
      !pendingNewCurrency ||
      !formDataToSubmit
    ) {
      toast.error(t("currencyConvertError"));
      return;
    }

    const missing = getMissingRates(originalCurrency, pendingNewCurrency);
    if (missing.length > 0) {
      toast.error(t("missingRateError", { currency: missing.join(", ") }));
      setShowDialog(false);
      return;
    }

    setIsConverting(true);
    const toastId = toast.loading(t("common:convertingCurrency"));

    try {
      await callRouteWithParams(
        "projects/convert-currency",
        { id: projectId },
        {
          old_currency: originalCurrency,
          new_currency: pendingNewCurrency,
        },
      );

      toast.success(t("common:currencyConverted"));
      await onConfirmConversion(pendingNewCurrency, formDataToSubmit);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || t("common:currencyConvertError"));
      onCancelConversion(originalCurrency);
    } finally {
      setIsConverting(false);
      setShowDialog(false);
      setPendingNewCurrency(null);
      setFormDataToSubmit(null);
      toast.dismiss(toastId);
    }
  }, [
    projectId,
    originalCurrency,
    pendingNewCurrency,
    formDataToSubmit,
    getMissingRates,
    onConfirmConversion,
    onCancelConversion,
    t,
  ]);

  const handleCancel = useCallback(() => {
    if (originalCurrency) {
      onCancelConversion(originalCurrency);
    }
    setShowDialog(false);
    setPendingNewCurrency(null);
    setFormDataToSubmit(null);
  }, [onCancelConversion, originalCurrency]);

  const openConversionDialog = useCallback(
    (
      currentProjectCurrency: string,
      newProjectCurrency: string,
      formData: ProjectFormValues,
    ) => {
      setOriginalCurrency(currentProjectCurrency);
      setPendingNewCurrency(newProjectCurrency);
      setFormDataToSubmit(formData);
      setShowDialog(true);
    },
    [],
  );

  return {
    showCurrencyConversionDialog: showDialog,
    setShowCurrencyConversionDialog: setShowDialog,
    pendingNewCurrency,
    originalCurrency,
    isConverting,
    openConversionDialog,
    handleConfirmConversion: handleConfirm,
    handleCancelConversion: handleCancel,
  };
}
