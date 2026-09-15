import { useTranslation } from "react-i18next";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RoleBadge({ role }: { role?: string }) {
  const { t } = useTranslation("roles");
  if (!role) return null;

  let variant: BadgeProps["variant"] = "muted";
  if (role === "super_admin") variant = "default";
  if (role === "admin") variant = "secondary";

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
