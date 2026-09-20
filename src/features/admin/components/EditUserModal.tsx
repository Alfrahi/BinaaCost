import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, Mail, Loader2 } from "lucide-react";
import { UserProfile } from "../hooks/useAdminUserManagement";

interface EditUserModalProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    password?: string;
  }) => Promise<void>;
  onSendPasswordReset?: (email: string) => Promise<void>;
  loading: boolean;
}

export default function EditUserModal({
  user,
  open,
  onOpenChange,
  onSave,
  onSendPasswordReset,
  loading,
}: EditUserModalProps) {
  const { t } = useTranslation(["admin", "roles", "common"]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setRole(user.role || "user");
      setPassword("");
    }
  }, [user, open]);

  if (!user) return null;

  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const handleSendResetEmail = async () => {
    if (!email || !onSendPasswordReset) return;
    try {
      setIsSendingReset(true);
      await onSendPasswordReset(email);
    } catch {
      // Error handled in parent mutation
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(t("admin:users.emailRequired"));
      return;
    }
    if (password && password.length < 8) {
      toast.error(t("admin:users.passwordMinLength"));
      return;
    }

    try {
      await onSave({
        user_id: user.id,
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        password: password ? password : undefined,
      });
      onOpenChange(false);
    } catch {
      // Error handled in parent mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("admin:users.editUserDetails")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("admin:users.editUserDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_first_name" className="text-sm">
                {t("admin:users.firstName")}
              </Label>
              <Input
                id="edit_first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("admin:users.firstNamePlaceholder")}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_last_name" className="text-sm">
                {t("admin:users.lastName")}
              </Label>
              <Input
                id="edit_last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("admin:users.lastNamePlaceholder")}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_email" className="text-sm">
              {t("admin:users.email")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_role" className="text-sm">
              {t("admin:users.role")}
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="edit_role" className="text-sm">
                <SelectValue placeholder={t("admin:editRoleModal.select_placeholder")}>
                  {t(`roles:${role}_display`, role.replace("_", " "))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user" className="text-sm">
                  {t("roles:user_display", "Estimator / User")}
                </SelectItem>
                <SelectItem value="super_admin" className="text-sm">
                  {t("roles:super_admin_display", "Super Admin")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password Reset Section */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <Label htmlFor="edit_password" className="text-sm font-medium">
                {t("admin:users.newPasswordOptional")}
              </Label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                {t("admin:users.generatePassword")}
              </button>
            </div>
            <Input
              id="edit_password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("admin:users.newPasswordPlaceholder")}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("admin:users.passwordResetHelper")}
            </p>

            {onSendPasswordReset && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSendResetEmail}
                  disabled={isSendingReset || loading || !email}
                  className="w-full text-xs gap-1.5"
                >
                  {isSendingReset ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  {isSendingReset
                    ? t("admin:users.sendingResetEmail")
                    : t("admin:users.sendPasswordResetEmail")}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-sm"
            >
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="text-sm">
              {loading ? t("common:saving") : t("common:save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
