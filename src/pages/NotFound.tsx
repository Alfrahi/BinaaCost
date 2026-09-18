import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Heading } from "@/shared/components/ui/heading";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation("errors");

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Heading level={1} className="mb-4">
          404
        </Heading>
        <p className="text-xl text-muted-foreground mb-4">
          {t("pageNotFound")}
        </p>
        <a
          href="/"
          className="text-primary hover:text-muted-foreground underline text-base"
        >
          {t("returnToHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
