import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { id: string; name: string }[];
  onConfirm: (groupId: string | null) => void;
  loading: boolean;
  count: number;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  groups,
  onConfirm,
  loading,
  count,
}: Props) {
  const { t } = useTranslation(["project_detail", "common"]);
  const [groupId, setGroupId] = useState<string>("ungrouped");

  const groupOptions = [
    { value: "ungrouped", label: t("groups.ungrouped") },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t("groups.moveItems", {
              count,
              defaultValue: `Move ${count} Items`,
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            {t("groups.selectDestination", "Select Destination Group")}
          </label>
          <TranslatedSelect
            value={groupId}
            onValueChange={setGroupId}
            options={groupOptions}
            placeholder={t("groups.selectGroup")}
            aria-label={t("groups.selectDestination")}
            className="text-sm"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-sm"
          >
            {t("common:cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(groupId === "ungrouped" ? null : groupId)}
            disabled={loading}
            className="text-sm"
          >
            {loading ? t("common:saving") : t("common:save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
