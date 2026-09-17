import { useAuth } from "@/app/providers/AuthProvider";
import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ReactNode } from "react";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const { t } = useTranslation("common");

  useEffect(() => {
    if (!loading && role !== "super_admin") {
      toast.error(t("accessDenied"));
    }
  }, [role, loading, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-base text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (!user || role !== "super_admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
