import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const ROLES = ["super_admin", "user"];

export default function EditRoleModal({
  profile,
  open,
  onOpenChange,
  onSave,
  loading,
}: {
  profile: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newRole: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation(["admin", "roles", "common"]);
  const [role, setRole] = useState(profile?.role || "");

  useEffect(() => {
    if (profile?.role) {
      setRole(profile.role);
    }
  }, [profile?.role, open]);

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("admin:editRoleModal.title", { email: profile.email })}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="text-sm">
              <SelectValue
                placeholder={t("admin:editRoleModal.select_placeholder")}
              >
                {role ? t(`roles:${role}_display`, role.replace("_", " ")) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className="text-sm">
                  {t(`roles:${r}_display`, r.replace("_", " "))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            onClick={() => onSave(role)}
            disabled={loading || role === profile.role}
            className="text-sm"
          >
            {loading ? t("common:saving") : t("common:save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
