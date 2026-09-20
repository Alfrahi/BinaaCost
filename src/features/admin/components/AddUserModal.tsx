import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddUser: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
  }) => Promise<void>;
  loading: boolean;
}

export default function AddUserModal({
  open,
  onOpenChange,
  onAddUser,
  loading,
}: AddUserModalProps) {
  const { t } = useTranslation(["admin", "roles", "common"]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("user");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(t("admin:users.emailRequired"));
      return;
    }
    if (!password || password.length < 8) {
      toast.error(t("admin:users.passwordMinLength"));
      return;
    }

    try {
      await onAddUser({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
      });
      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled in parent mutation
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("admin:users.addUser")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-sm">
                {t("admin:users.firstName")}
              </Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("admin:users.firstNamePlaceholder")}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-sm">
                {t("admin:users.lastName")}
              </Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("admin:users.lastNamePlaceholder")}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user_email" className="text-sm">
              {t("admin:users.email")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user_role" className="text-sm">
              {t("admin:users.role")}
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="user_role" className="text-sm">
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

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="user_password" className="text-sm">
                {t("admin:users.password")} <span className="text-destructive">*</span>
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
              id="user_password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("admin:users.passwordPlaceholder")}
              required
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("admin:users.passwordHelper")}
            </p>
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
              {loading ? t("common:saving") : t("admin:users.createUser")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
