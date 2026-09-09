import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Trash2 } from "lucide-react";
import { ProjectShare } from "@/hooks/useProjectSharing";
import { sanitizeText } from "@/utils/sanitizeText";

interface EditInternalShareRowProps {
  share: ProjectShare;
  isEditing: boolean;
  isUpdating: boolean;
  onEdit: (share: ProjectShare) => void;
  onSave: (shareId: string, newRole: "viewer" | "editor") => Promise<void>;
  onCancelEdit: () => void;
  onDelete: (share: ProjectShare) => void;
}

export function EditInternalShareRow({
  share,
  isEditing,
  isUpdating,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: EditInternalShareRowProps) {
  const { t } = useTranslation(["project_detail", "common", "roles"]);
  const [currentRole, setCurrentRole] = useState<"viewer" | "editor">(
    share.role,
  );

  const handleSave = async () => {
    await onSave(share.share_id, currentRole);
  };

  return (
    <TableRow key={share.share_id}>
      <TableCell className="whitespace-nowrap text-sm text-foreground">
        {sanitizeText(share.email)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {isEditing ? (
          <Select
            value={currentRole}
            onValueChange={(value: "viewer" | "editor") =>
              setCurrentRole(value)
            }
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[120px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer" className="text-sm">
                {t("roles:viewer_display")}
              </SelectItem>
              <SelectItem value="editor" className="text-sm">
                {t("roles:editor_display")}
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="capitalize">{t(`roles:${share.role}_display`)}</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-end text-sm font-medium">
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isUpdating || currentRole === share.role}
                className="text-sm"
              >
                {isUpdating ? t("common:saving") : t("common:save")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelEdit}
                disabled={isUpdating}
                className="text-sm"
              >
                {t("common:cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  onEdit(share);
                  setCurrentRole(share.role);
                }}
                className="h-7 w-7"
              >
                <Edit2 className="w-3 h-3" aria-hidden="true" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(share)}
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
