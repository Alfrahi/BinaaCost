import { useTranslation } from "react-i18next";
import { useState } from "react";
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
import { Loader2, Plus } from "lucide-react";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { toast } from "sonner";

import { z } from "zod";

interface AddInternalShareFormProps {
  isAdding: boolean;
  onAdd: (email: string, role: "viewer" | "editor") => Promise<void>;
}

const internalShareSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "project_detail:share.emailRequired" })
    .email({ message: "project_detail:share.invalidEmail" }),
  role: z.enum(["viewer", "editor"]),
});

export function AddInternalShareForm({
  isAdding,
  onAdd,
}: AddInternalShareFormProps) {
  const { t } = useTranslation(["project_detail", "common", "roles"]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = internalShareSchema.safeParse({ email, role });
    if (!result.success) {
      const firstError = result.error.errors[0];
      const messageKey = firstError?.message || "common:invalidInput";
      toast.error(t(messageKey as any));
      return;
    }
    await onAdd(result.data.email, result.data.role);
    setEmail("");
    setRole("viewer");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 items-end"
    >
      <div className="flex-1 space-y-2 w-full">
        <Label htmlFor="new-share-email" className="text-sm">
          {t("project_detail:share.email")}
        </Label>
        <Input
          id="new-share-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("project_detail:share.emailPlaceholder")}
          className="text-sm"
          disabled={isAdding}
        />
      </div>
      <div className="space-y-2 w-full sm:w-auto">
        <Label htmlFor="new-share-role" className="text-sm">
          {t("project_detail:share.role")}
        </Label>
        <Select
          value={role}
          onValueChange={(value: "viewer" | "editor") => setRole(value)}
          disabled={isAdding}
        >
          <SelectTrigger id="new-share-role" className="text-sm">
            <SelectValue>
              {role === "viewer" ? t("roles:viewer_display") : t("roles:editor_display")}
            </SelectValue>
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
      </div>
      <Button
        type="submit"
        disabled={isAdding || !email.trim()}
        className="text-sm w-full sm:w-auto"
      >
        {isAdding ? (
          <Loader2
            className={cn("w-4 h-4", getIconMarginClass(), "animate-spin")}
          />
        ) : (
          <Plus className={cn("w-4 h-4", getIconMarginClass())} />
        )}
        {t("project_detail:share.addShare")}
      </Button>
    </form>
  );
}
