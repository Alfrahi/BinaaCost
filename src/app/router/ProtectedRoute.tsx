import { useAuth } from "@/features/auth";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { t } = useTranslation("common");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-base text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
