import { useTranslation, Trans } from "react-i18next";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  loading?: boolean;
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  loading = false,
}: Props) {
  const { t } = useTranslation("common");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={t("areYouSure")}
      body={
        itemName ? (
          <Trans
            i18nKey="deleteConfirmationBody_item"
            values={{ itemName }}
            components={{ 1: <span className="font-bold" /> }}
          />
        ) : (
          t("deleteConfirmationBody")
        )
      }
      confirmLabel={loading ? t("deleting") : t("delete")}
      loading={loading}
      destructive
    />
  );
}