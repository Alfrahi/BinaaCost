import ConfirmDialog from "@/components/ConfirmDialog";
import { useTranslation } from "react-i18next";

interface CurrencyConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalCurrency: string | null;
  pendingNewCurrency: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isConverting: boolean;
}

export function CurrencyConversionDialog({
  open,
  onOpenChange,
  originalCurrency,
  pendingNewCurrency,
  onConfirm,
  onCancel,
  isConverting,
}: CurrencyConversionDialogProps) {
  const { t } = useTranslation(["common"]);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
        onOpenChange(nextOpen);
      }}
      onConfirm={onConfirm}
      title={t("currencyConversionWarningTitle")}
      body={
        <p>
          {t("currencyConversionWarningDescription", {
            oldCurrency: originalCurrency,
            newCurrency: pendingNewCurrency,
          })}
        </p>
      }
      confirmLabel={
        isConverting ? t("common:converting") : t("common:continue")
      }
      cancelLabel={t("common:cancel")}
      loading={isConverting}
    />
  );
}
