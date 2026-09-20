import { useTranslation } from "react-i18next";
import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

export function RoleBadge({ role }: { role?: string }) {
  const { t } = useTranslation("roles");
  if (!role) return null;

  let variant: BadgeProps["variant"] = "muted";
  if (role === "super_admin") variant = "default";

  const translatedRole = t(role, role.replace("_", " "));

  return (
    <Badge
      variant={variant}
      className={cn(
        "ms-2 uppercase tracking-wide",
        role === "super_admin" && "font-bold",
      )}
      title={translatedRole}
    >
      {translatedRole}
    </Badge>
  );
}
